/**
 * Live preview extensions for CodeMirror 6
 * Provides Obsidian-like live preview editing with widgets for:
 * - Checkboxes ([ ] and [x])
 * - Images (![]())
 * - Wiki links ([[...]])
 * - External links ([...](...))
 * - Horizontal rules (---, ***, ___)
 * - Code blocks (```language ... ```)
 */

import { WidgetType, EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { Range, StateField } from '@codemirror/state';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MonacoEmbed } from '../embeds/MonacoEmbed';

// ========== Widget Classes ==========

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean, readonly pos: number) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = this.checked;
    checkbox.className = 'cm-checkbox-widget cursor-pointer w-4 h-4 align-middle mr-1';
    
    checkbox.addEventListener('click', (e) => {
      e.preventDefault();
      const newText = this.checked ? '[ ]' : '[x]';
      view.dispatch({
        changes: { from: this.pos, to: this.pos + 3, insert: newText }
      });
    });
    
    return checkbox;
  }

  eq(other: CheckboxWidget): boolean {
    return other.checked === this.checked && other.pos === this.pos;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

class ImageWidget extends WidgetType {
  constructor(
    readonly src: string, 
    readonly alt: string, 
    readonly fullMatch: string,
    readonly vaultPath?: string
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cm-image-widget my-2';
    
    const img = document.createElement('img');
    
    // Check if path is relative (doesn't start with http://, https://, or absolute path indicators)
    const isRelativePath = this.src && 
      !this.src.startsWith('http://') && 
      !this.src.startsWith('https://') &&
      !this.src.startsWith('data:') &&
      !this.src.startsWith('/') &&
      !this.src.match(/^[a-zA-Z]:/); // Windows absolute path
    
    if (isRelativePath && this.vaultPath) {
      // Convert relative path to local-file protocol URL
      // Handle the path properly
      const normalizedVaultPath = this.vaultPath.replace(/\\/g, '/');
      const normalizedSrc = this.src.replace(/\\/g, '/');
      
      // Construct the full path
      const fullImagePath = `${normalizedVaultPath}/${normalizedSrc}`;
      
      // URL encode the path segments but keep forward slashes
      // Don't encode drive letter colon (e.g., C:)
      const encodedPath = fullImagePath.split('/').map((segment, i) => {
        // First segment might be drive letter like "C:" - don't encode the colon
        if (i === 0 && /^[a-zA-Z]:$/.test(segment)) {
          return segment;
        }
        return encodeURIComponent(segment);
      }).join('/');
      
      // Use three slashes for absolute paths (local-file:///C:/...)
      img.src = `local-file:///${encodedPath}`;
    } else {
      img.src = this.src;
    }
    
    img.alt = this.alt;
    img.className = 'max-w-full h-auto rounded border border-gray-200 dark:border-gray-700';
    img.style.maxHeight = '400px';
    
    // Prevent default browser drag behavior
    img.draggable = false;
    
    // Error handling - show placeholder if image fails to load
    img.onerror = () => {
      img.style.display = 'none';
      const errorDiv = document.createElement('div');
      errorDiv.className = 'text-red-500 text-sm p-2 border border-red-300 rounded';
      errorDiv.textContent = `Failed to load image: ${this.src}`;
      container.appendChild(errorDiv);
    };
    
    if (this.alt) {
      const caption = document.createElement('div');
      caption.className = 'text-xs text-gray-500 mt-1';
      caption.textContent = this.alt;
      container.appendChild(img);
      container.appendChild(caption);
    } else {
      container.appendChild(img);
    }
    
    return container;
  }

  eq(other: ImageWidget): boolean {
    return other.src === this.src && other.alt === this.alt;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

class WikiLinkWidget extends WidgetType {
  constructor(readonly target: string, readonly displayText?: string) {
    super();
  }

  toDOM(): HTMLElement {
    const link = document.createElement('span');
    link.className = 'cm-wikilink-widget text-blue-600 dark:text-blue-400 cursor-pointer hover:underline';
    link.textContent = this.displayText || this.target;
    link.title = `Link to: ${this.target}`;
    
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Dispatch event to open the linked file
      window.dispatchEvent(new CustomEvent('open-wikilink', { detail: { target: this.target } }));
    });
    
    return link;
  }

  eq(other: WikiLinkWidget): boolean {
    return other.target === this.target && other.displayText === this.displayText;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

class ExternalLinkWidget extends WidgetType {
  constructor(readonly url: string, readonly text: string) {
    super();
  }

  toDOM(): HTMLElement {
    const link = document.createElement('a');
    link.href = this.url;
    link.className = 'cm-external-link-widget text-blue-600 dark:text-blue-400 cursor-pointer hover:underline';
    link.textContent = this.text;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    return link;
  }

  eq(other: ExternalLinkWidget): boolean {
    return other.url === this.url && other.text === this.text;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

class HorizontalRuleWidget extends WidgetType {
  toDOM(): HTMLElement {
    const hr = document.createElement('hr');
    hr.className = 'cm-hr-widget my-4 border-gray-300 dark:border-gray-600';
    return hr;
  }

  eq(): boolean {
    return true;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

class CodeBlockWidget extends WidgetType {
  private root: Root | null = null;
  private container: HTMLElement | null = null;
  private currentCode: string;
  private editorView: EditorView | null = null;
  private from: number;
  private to: number;
  
  constructor(
    readonly code: string,
    readonly language: string,
    from: number,
    to: number
  ) {
    super();
    this.currentCode = code;
    this.from = from;
    this.to = to;
  }

  private resolveCurrentBlockRange(view: EditorView, expectedCode: string): { from: number; to: number; fence: string; langTag: string } | null {
    const fullText = view.state.doc.toString();
    const codeBlockRegex = /^(```|~~~)(\w*)\r?\n([\s\S]*?)\r?\n\1(?=\r?\n|$)/gm;

    type Candidate = { from: number; to: number; fence: string; langTag: string; code: string };
    const candidates: Candidate[] = [];
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(fullText)) !== null) {
      const from = match.index;
      const to = from + match[0].length;
      candidates.push({
        from,
        to,
        fence: match[1],
        langTag: match[2] || '',
        code: match[3],
      });
    }

    if (candidates.length === 0) return null;

    const anchor = Math.max(0, Math.min(this.from, fullText.length));

    const containing = candidates.find((c) => anchor >= c.from && anchor <= c.to);
    if (containing) {
      return { from: containing.from, to: containing.to, fence: containing.fence, langTag: containing.langTag };
    }

    const exactCodeMatch = candidates.find((c) => c.langTag === this.language && c.code === expectedCode);
    if (exactCodeMatch) {
      return { from: exactCodeMatch.from, to: exactCodeMatch.to, fence: exactCodeMatch.fence, langTag: exactCodeMatch.langTag };
    }

    const nearest = candidates.reduce((best, current) => {
      const bestDistance = Math.abs(best.from - anchor);
      const currentDistance = Math.abs(current.from - anchor);
      return currentDistance < bestDistance ? current : best;
    });

    return { from: nearest.from, to: nearest.to, fence: nearest.fence, langTag: nearest.langTag };
  }

  toDOM(view: EditorView): HTMLElement {
    this.editorView = view;
    const container = document.createElement('div');
    this.container = container;
    container.className = 'cm-codeblock-widget';
    
    // Calculate height based on line count
    // Use box-sizing: border-box so border is included in height calculation
    const lineCount = this.code.split('\n').length;
    const height = Math.min(400, Math.max(100, lineCount * 20 + 20));
    container.style.height = `${height}px`;
    container.style.boxSizing = 'border-box';
    // Note: margin and border are set via CSS class to avoid duplication
    // The CSS class .cm-codeblock-widget handles margin, borderRadius, overflow, border
    
    this.renderMonaco(container, view);
    
    return container;
  }

  private renderMonaco(container: HTMLElement, view: EditorView) {
    if (this.root) {
      this.root.unmount();
    }
    
    this.root = createRoot(container);
    this.root.render(
      React.createElement(MonacoEmbed, {
        code: this.currentCode,
        language: this.language,
        onChange: (newCode: string) => {
          // Only dispatch if code actually changed
          if (newCode === this.currentCode) return;
          const previousCode = this.currentCode;

          // Resolve block range from current document state to avoid stale offsets
          const range = this.resolveCurrentBlockRange(view, previousCode);
          if (!range) return;

          this.currentCode = newCode;
          this.from = range.from;
          this.to = range.to;
          
          view.dispatch({
            changes: {
              from: range.from,
              to: range.to,
              insert: `${range.fence}${range.langTag}\n${newCode}\n${range.fence}`
            }
          });
        },
        readOnly: false
      })
    );
  }

  updateDOM(dom: HTMLElement, view: EditorView): boolean {
    // Update height if line count changed significantly
    const lineCount = this.code.split('\n').length;
    const height = Math.min(400, Math.max(100, lineCount * 20 + 20));
    dom.style.height = `${height}px`;
    
    // Update internal state - Monaco will handle its own state
    this.currentCode = this.code;
    this.editorView = view;
    this.container = dom;
    
    // Return true to indicate we handled the update (don't recreate)
    return true;
  }

  eq(other: CodeBlockWidget): boolean {
    // Compare language and approximate position (allow some drift for edits)
    // This prevents recreation when code changes but structure is same
    // Position can drift by up to 500 chars (roughly 20 lines of edits) and still match
    const positionClose = Math.abs(other.from - this.from) < 500;
    return other.language === this.language && positionClose;
  }

  destroy(): void {
    if (this.root) {
      // Delay unmount to avoid React warning about sync unmount during render
      setTimeout(() => {
        this.root?.unmount();
        this.root = null;
      }, 0);
    }
  }

  ignoreEvent(event: Event): boolean {
    // Allow all events to pass through to Monaco
    return true;
  }
}

// ========== Decoration Builders ==========

// Build single-line decorations only (for ViewPlugin)
function buildSingleLineDecorations(view: EditorView, vaultPath?: string, codeBlockRanges?: Array<{ from: number; to: number }>): DecorationSet {
  const widgets: Range<Decoration>[] = [];
  const doc = view.state.doc;
  
  // Get current selection to avoid decorating at cursor position
  const selection = view.state.selection.main;
  
  // Helper to check if a position is inside a code block
  const isInCodeBlock = (pos: number) => {
    if (!codeBlockRanges) return false;
    return codeBlockRanges.some(range => pos >= range.from && pos <= range.to);
  };
  
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const lineText = line.text;
    
    // Skip lines inside code blocks
    if (isInCodeBlock(line.from)) {
      continue;
    }
    
    // Check if cursor is on this line
    const cursorOnLine = selection.from >= line.from && selection.from <= line.to;
    
    // Skip decoration on lines where cursor is present (allow editing)
    if (cursorOnLine) {
      continue;
    }
    
    // Check for checkboxes: - [ ] or - [x]
    const checkboxMatch = lineText.match(/^(\s*[-*+]\s+)\[([ xX])\]/);
    if (checkboxMatch) {
      const bracketStart = line.from + checkboxMatch[1].length;
      const isChecked = checkboxMatch[2].toLowerCase() === 'x';
      widgets.push(Decoration.replace({
        widget: new CheckboxWidget(isChecked, bracketStart),
      }).range(bracketStart, bracketStart + 3));
    }
    
    // Check for images: ![alt](src)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let imageMatch;
    while ((imageMatch = imageRegex.exec(lineText)) !== null) {
      const start = line.from + imageMatch.index;
      const end = start + imageMatch[0].length;
      
      widgets.push(Decoration.replace({
        widget: new ImageWidget(imageMatch[2], imageMatch[1], imageMatch[0], vaultPath),
      }).range(start, end));
    }
    
    // Check for wiki links: [[target]] or [[target|display]]  
    const wikiLinkRegex = /\[\[((?:[^\]|]|\\\]|\\\|)+)(?:\|((?:[^\]]|\\\])+))?\]\]/g;
    let wikiMatch;
    while ((wikiMatch = wikiLinkRegex.exec(lineText)) !== null) {
      const start = line.from + wikiMatch.index;
      const end = start + wikiMatch[0].length;
      const target = wikiMatch[1].replace(/\\([|\]])/g, '$1');
      const display = wikiMatch[2]?.replace(/\\([|\]])/g, '$1');
      
      widgets.push(Decoration.replace({
        widget: new WikiLinkWidget(target, display),
      }).range(start, end));
    }
    
    // Check for external links: [text](url)
    const extLinkRegex = /(?<!!)\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    let extMatch;
    while ((extMatch = extLinkRegex.exec(lineText)) !== null) {
      const start = line.from + extMatch.index;
      const end = start + extMatch[0].length;
      
      widgets.push(Decoration.replace({
        widget: new ExternalLinkWidget(extMatch[2], extMatch[1]),
      }).range(start, end));
    }
    
    // Check for horizontal rules: ---, ***, ___
    if (/^\s*([-*_])\1{2,}\s*$/.test(lineText)) {
      widgets.push(Decoration.replace({
        widget: new HorizontalRuleWidget(),
      }).range(line.from, line.to));
    }
  }
  
  return Decoration.set(widgets, true);
}

// Embed types handled by Editor.tsx - should NOT be rendered as code blocks by livePreview
const EMBED_TYPES = ['website', 'desmos', 'excalidraw', 'mermaid', 'monaco', 'kanban', 'spreadsheet'];

// Find code block ranges in document
function findCodeBlockRanges(doc: { toString: () => string }, selection: { from: number; to: number }): Array<{ from: number; to: number; language: string; code: string }> {
  const ranges: Array<{ from: number; to: number; language: string; code: string }> = [];
  const fullText = doc.toString();
  // Match code blocks: opening fence with optional language, content, closing fence
  const codeBlockRegex = /^(```|~~~)(\w*)\r?\n([\s\S]*?)\r?\n\1(?=\r?\n|$)/gm;
  let codeMatch;
  
  while ((codeMatch = codeBlockRegex.exec(fullText)) !== null) {
    const blockStart = codeMatch.index;
    const blockEnd = blockStart + codeMatch[0].length;
    const language = codeMatch[2] || 'plaintext';
    const code = codeMatch[3];
    
    // Skip embed types - these are handled by Editor.tsx as separate embed blocks
    if (EMBED_TYPES.includes(language.toLowerCase())) {
      continue;
    }
    
    // Check if cursor is inside this code block
    const cursorInBlock = selection.from >= blockStart && selection.from <= blockEnd;
    
    if (!cursorInBlock) {
      ranges.push({ from: blockStart, to: blockEnd, language, code });
    }
  }
  
  return ranges;
}

// ========== State Field for Code Block Decorations (multiline) ==========

export function createCodeBlockField() {
  return StateField.define<DecorationSet>({
    create(state) {
      const selection = state.selection.main;
      const ranges = findCodeBlockRanges(state.doc, selection);
      const widgets: Range<Decoration>[] = [];
      
      for (const range of ranges) {
        widgets.push(Decoration.replace({
          widget: new CodeBlockWidget(range.code, range.language, range.from, range.to),
          block: true,
        }).range(range.from, range.to));
      }
      
      return Decoration.set(widgets);
    },
    update(decorations, tr) {
      if (tr.docChanged || tr.selection) {
        const selection = tr.state.selection.main;
        const ranges = findCodeBlockRanges(tr.state.doc, selection);
        const widgets: Range<Decoration>[] = [];
        
        for (const range of ranges) {
          widgets.push(Decoration.replace({
            widget: new CodeBlockWidget(range.code, range.language, range.from, range.to),
            block: true,
          }).range(range.from, range.to));
        }
        
        return Decoration.set(widgets);
      }
      return decorations;
    },
    provide(field) {
      return EditorView.decorations.from(field);
    }
  });
}

// ========== View Plugin for Single-Line Decorations ==========

export function createLivePreviewPlugin(vaultPath?: string) {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    
    constructor(view: EditorView) {
      const selection = view.state.selection.main;
      const codeBlockRanges = findCodeBlockRanges(view.state.doc, selection);
      this.decorations = buildSingleLineDecorations(view, vaultPath, codeBlockRanges);
    }
    
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        const selection = update.state.selection.main;
        const codeBlockRanges = findCodeBlockRanges(update.state.doc, selection);
        this.decorations = buildSingleLineDecorations(update.view, vaultPath, codeBlockRanges);
      }
    }
  }, {
    decorations: v => v.decorations,
    eventHandlers: {
      // Prevent decoration on mouse interactions in edited areas
      mousedown: () => {
        return false;
      }
    }
  });
}

// ========== Styling ==========

export const livePreviewTheme = EditorView.baseTheme({
  '.cm-checkbox-widget': {
    cursor: 'pointer',
    verticalAlign: 'middle',
  },
  '.cm-image-widget': {
    display: 'block',
    margin: '8px 0',
  },
  '.cm-image-widget img': {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: '4px',
  },
  '.cm-codeblock-widget': {
    display: 'block',
    boxSizing: 'border-box',
    borderRadius: '8px',
    margin: '0 0 0 0 !important', // Override default margin to prevent extra space around code blocks
    overflow: 'hidden',
    border: '1px solid var(--border, #374151)',
  },
  '.cm-wikilink-widget': {
    cursor: 'pointer',
  },
  '.cm-external-link-widget': {
    cursor: 'pointer',
  },
  '.cm-hr-widget': {
    border: 'none',
    borderTop: '1px solid',
    margin: '16px 0',
  },
  // Hide certain markdown syntax when not editing
  '.cm-formatting': {
    opacity: '0.5',
  },
});

// ========== Markdown Hiding Extension ==========

// Hide markdown formatting when cursor is not on the line
export function createMarkdownHidingPlugin() {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    
    constructor(view: EditorView) {
      this.decorations = this.buildHidingDecorations(view);
    }
    
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        this.decorations = this.buildHidingDecorations(update.view);
      }
    }
    
    buildHidingDecorations(view: EditorView): DecorationSet {
      const widgets: Range<Decoration>[] = [];
      const doc = view.state.doc;
      const selection = view.state.selection.main;
      
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const cursorOnLine = selection.from >= line.from && selection.from <= line.to;
        
        if (cursorOnLine) continue;
        
        const lineText = line.text;
        
        // Hide bold markers: **text** or __text__
        const boldRegex = /(\*\*|__)(?=\S)(.*?\S)\1/g;
        let match;
        while ((match = boldRegex.exec(lineText)) !== null) {
          const markerLen = 2;
          const start = line.from + match.index;
          const end = start + match[0].length;
          
          // Hide opening marker
          widgets.push(Decoration.replace({}).range(start, start + markerLen));
          // Hide closing marker
          widgets.push(Decoration.replace({}).range(end - markerLen, end));
        }
        
        // Hide italic markers: *text* or _text_
        const italicRegex = /(?<!\*|_)([*_])(?!\s)((?:[^*_]|\*(?!\*)|_(?!_))+?)(?<!\s)\1(?!\*|_)/g;
        while ((match = italicRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          
          // Hide opening marker
          widgets.push(Decoration.replace({}).range(start, start + 1));
          // Hide closing marker  
          widgets.push(Decoration.replace({}).range(end - 1, end));
        }
        
        // Hide strikethrough markers: ~~text~~
        const strikeRegex = /~~(?=\S)(.*?\S)~~/g;
        while ((match = strikeRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          
          // Hide opening marker
          widgets.push(Decoration.replace({}).range(start, start + 2));
          // Hide closing marker
          widgets.push(Decoration.replace({}).range(end - 2, end));
        }
        
        // NOTE: Do not hide inline code backticks (`code`) here.
        // Replacing those delimiters with zero-width decorations causes
        // cursor hit-testing/placement issues around grave characters.
        
        // Hide header markers: # ## ### etc
        const headerMatch = lineText.match(/^(#{1,6})\s/);
        if (headerMatch) {
          const markerEnd = line.from + headerMatch[1].length + 1;
          widgets.push(Decoration.replace({}).range(line.from, markerEnd));
        }
      }
      
      // Sort and deduplicate ranges
      widgets.sort((a, b) => a.from - b.from);
      
      // Filter out overlapping ranges
      const filteredWidgets: Range<Decoration>[] = [];
      let lastEnd = -1;
      for (const widget of widgets) {
        if (widget.from >= lastEnd) {
          filteredWidgets.push(widget);
          lastEnd = widget.to;
        }
      }
      
      return Decoration.set(filteredWidgets);
    }
  }, {
    decorations: v => v.decorations
  });
}

// ========== Heading Style Extension ==========

export function createHeadingStylePlugin() {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    
    constructor(view: EditorView) {
      this.decorations = this.buildHeadingDecorations(view);
    }
    
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        this.decorations = this.buildHeadingDecorations(update.view);
      }
    }
    
    buildHeadingDecorations(view: EditorView): DecorationSet {
      const decorations: Range<Decoration>[] = [];
      const doc = view.state.doc;
      const selection = view.state.selection.main;
      
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const lineText = line.text;
        const cursorOnLine = selection.from >= line.from && selection.from <= line.to;
        
        // Match headers
        const headerMatch = lineText.match(/^(#{1,6})\s/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const className = `cm-header-${level}`;
          
          decorations.push(
            Decoration.line({ class: className }).range(line.from)
          );
        }
        
        // Add styling for blockquotes
        if (lineText.startsWith('>')) {
          decorations.push(
            Decoration.line({ class: 'cm-blockquote' }).range(line.from)
          );
        }
        
        // Add styling for code blocks
        if (lineText.startsWith('```') || lineText.startsWith('~~~')) {
          decorations.push(
            Decoration.line({ class: 'cm-codeblock-delimiter' }).range(line.from)
          );
        }
      }
      
      return Decoration.set(decorations);
    }
  }, {
    decorations: v => v.decorations
  });
}

// ========== Combined Extension ==========

export function livePreviewExtension(vaultPath?: string) {
  return [
    livePreviewTheme,
    createCodeBlockField(),
    createLivePreviewPlugin(vaultPath),
    createMarkdownHidingPlugin(),
    createHeadingStylePlugin(),
  ];
}

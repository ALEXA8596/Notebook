/**
 * Live preview extensions for CodeMirror 6
 * Provides Obsidian-like live preview editing with widgets for:
 * - Checkboxes ([ ] and [x])
 * - Images (![]())
 * - Wiki links ([[...]])
 * - External links ([...](...))
 * - Horizontal rules (---, ***, ___)
 */

import { WidgetType, EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { Range, StateField } from '@codemirror/state';

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
      
      // URL encode the path but keep forward slashes
      const encodedPath = fullImagePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
      
      img.src = `local-file://${encodedPath}`;
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

// ========== Decoration Builders ==========

function buildDecorations(view: EditorView, vaultPath?: string): DecorationSet {
  const widgets: Range<Decoration>[] = [];
  const doc = view.state.doc;
  
  // Get current selection to avoid decorating at cursor position
  const selection = view.state.selection.main;
  
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const lineText = line.text;
    
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

// ========== State Field for Decorations ==========

export function createLivePreviewField(vaultPath?: string) {
  return StateField.define<DecorationSet>({
    create(state) {
      return Decoration.none;
    },
    update(decorations, tr) {
      // We'll rebuild decorations in the view plugin
      return decorations;
    },
    provide(field) {
      return EditorView.decorations.from(field);
    }
  });
}

// ========== View Plugin for Live Updates ==========

export function createLivePreviewPlugin(vaultPath?: string) {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view, vaultPath);
    }
    
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildDecorations(update.view, vaultPath);
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
        
        // Hide inline code markers: `code`
        const codeRegex = /`([^`]+)`/g;
        while ((match = codeRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          
          // Hide opening backtick
          widgets.push(Decoration.replace({}).range(start, start + 1));
          // Hide closing backtick
          widgets.push(Decoration.replace({}).range(end - 1, end));
        }
        
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
    createLivePreviewPlugin(vaultPath),
    createMarkdownHidingPlugin(),
    createHeadingStylePlugin(),
  ];
}

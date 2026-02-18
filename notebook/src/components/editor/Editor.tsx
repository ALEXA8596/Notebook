import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TextBlock } from './TextBlock';
import { DesmosEmbed } from '../embeds/DesmosEmbed';
import { ExcalidrawEmbed } from '../embeds/ExcalidrawEmbed';
import { WebsiteEmbed } from '../embeds/WebsiteEmbed';
import { MermaidEmbed } from '../embeds/MermaidEmbed';
import { MonacoEmbed } from '../embeds/MonacoEmbed';
import { KanbanEmbed } from '../embeds/KanbanEmbed';
import { SpreadsheetEmbed } from '../embeds/SpreadsheetEmbed';
import { ContextMenu, ContextMenuOption } from '../ui/ContextMenu';
import { Link, ExternalLink, Scissors, Copy, Clipboard, Type, AlignLeft, Plus, GripHorizontal, Code, Trash2, SpellCheck } from 'lucide-react';
import { useAppStore } from '../../store/store';

// Get word at cursor position
function getWordAtPosition(text: string, position: number): { word: string; start: number; end: number } | null {
  if (!text || position < 0 || position > text.length) return null;
  
  // Find word boundaries
  let start = position;
  let end = position;
  
  // Move start back to beginning of word
  while (start > 0 && /[a-zA-Z']/.test(text[start - 1])) {
    start--;
  }
  
  // Move end forward to end of word
  while (end < text.length && /[a-zA-Z']/.test(text[end])) {
    end++;
  }
  
  if (start === end) return null;
  
  return {
    word: text.substring(start, end),
    start,
    end
  };
}

// Get spelling suggestions using Chromium's built-in spellchecker
function getSpellingSuggestions(word: string): string[] {
  try {
    // Use Chromium's built-in spellchecker via Electron API
    if (window.electronAPI?.spellCheck) {
      const isMisspelled = window.electronAPI.spellCheck.isWordMisspelled(word);
      if (isMisspelled) {
        return window.electronAPI.spellCheck.getWordSuggestions(word);
      }
    }
    return [];
  } catch (e) {
    console.warn('Spell check not available:', e);
    return [];
  }
}

const ResizableWrapper: React.FC<{ 
  children: React.ReactNode; 
  width?: number; 
  height?: number; 
  onResize: (width: number, height: number) => void;
  onToggleRaw?: () => void;
  onDelete?: () => void;
}> = ({ children, width = 800, height = 400, onResize, onToggleRaw, onDelete }) => {
  const [dims, setDims] = useState({ width, height });
  const [isResizing, setIsResizing] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startDims = useRef({ width: 0, height: 0 });

  useEffect(() => {
    setDims({ width, height });
  }, [width, height]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startDims.current = { width: dims.width, height: dims.height };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      setDims({
        width: Math.max(300, startDims.current.width + dx),
        height: Math.max(200, startDims.current.height + dy)
      });
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        onResize(dims.width, dims.height);
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, dims, onResize]);

  return (
    <div 
      className="relative group border border-transparent hover:border-gray-200 dark:hover:border-gray-700 rounded p-1 mx-auto my-4" 
      style={{ width: dims.width, maxWidth: '100%', height: dims.height }}
    >
      <div className="w-full h-full overflow-hidden relative">
        {children}
        {isResizing && (
          <div className="absolute inset-0 z-50 bg-transparent cursor-se-resize" />
        )}
      </div>
      
      {onToggleRaw && (
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button 
            className="p-1.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded shadow hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={(e) => { e.stopPropagation(); onToggleRaw(); }}
            title="Toggle Raw View"
          >
            <Code size={14} />
          </button>
          {onDelete && (
            <button 
              className="p-1.5 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 rounded shadow hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Delete Block"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-tl"
        onMouseDown={handleMouseDown}
      >
        <GripHorizontal size={12} className="transform -rotate-45" />
      </div>
    </div>
  );
};

interface EditorProps {
  content: string;
  onChange: (newContent: string) => void;
  showStatusBar?: boolean;
}

interface Block {
  id: string;
  type: 'text' | 'website' | 'desmos' | 'excalidraw' | 'mermaid' | 'monaco' | 'kanban' | 'spreadsheet';
  content: string;
  width?: number;
  height?: number;
}

// Helper to calculate word count and reading time
const getContentStats = (content: string) => {
  const text = content.replace(/```[\s\S]*?```/g, ''); // Remove code blocks
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const charCount = text.length;
  const readingTime = Math.ceil(wordCount / 200); // 200 words per minute
  return { wordCount, charCount, readingTime };
};

export const Editor: React.FC<EditorProps> = ({ content, onChange, showStatusBar = true }) => {
  const { currentPath, activeFile } = useAppStore();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [viewMode, setViewMode] = useState<'live' | 'edit' | 'preview' | 'split'>('live');
  const [contextMenu, setContextMenu] = useState<{ 
    x: number; 
    y: number; 
    visible: boolean; 
    blockId?: string; 
    cursorIndex?: number;
    wordInfo?: { word: string; start: number; end: number } | null;
  } | null>(null);
  const [rawModeBlocks, setRawModeBlocks] = useState<Set<string>>(new Set());
  const [focusRequest, setFocusRequest] = useState<{ blockId: string; token: number; position: 'start' | 'end'; column?: number } | null>(null);
  const prevBlocksRef = useRef<Block[]>([]); // keep ids stable so text blocks don't remount

  // Calculate stats
  const stats = useMemo(() => getContentStats(content), [content]);

  // Parse content into blocks
  useEffect(() => {
    const parsed: Omit<Block, 'id'>[] = [];
    const regex = /```(website|desmos|excalidraw|mermaid|monaco|kanban|spreadsheet)(?: \{width=(\d+) height=(\d+)\})?\n([\s\S]*?)\n```/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parsed.push({
          type: 'text',
          content: content.substring(lastIndex, match.index),
        });
      }

      parsed.push({
        type: match[1] as any,
        content: match[4],
        width: match[2] ? parseInt(match[2]) : undefined,
        height: match[3] ? parseInt(match[3]) : undefined,
      });

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parsed.push({ type: 'text', content: content.substring(lastIndex) });
    }

    if (parsed.length === 0) {
      parsed.push({ type: 'text', content: '' });
    }

    const prev = prevBlocksRef.current;
    const withIds: Block[] = parsed.map((b, idx) => {
      const previous = prev[idx];
      if (previous && previous.type === b.type) {
        return { ...b, id: previous.id, width: b.width ?? previous.width, height: b.height ?? previous.height };
      }
      return { ...b, id: uuidv4() };
    });

    prevBlocksRef.current = withIds;
    setBlocks(withIds);
  }, [content]);

  const handleBlockChange = useCallback((id: string, newContent: string, width?: number, height?: number) => {
    setBlocks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, content: newContent, width: width ?? b.width, height: height ?? b.height } : b));
      
      // Reconstruct full content
      const fullContent = next.map((b) => {
        if (b.type === 'text') return b.content;
        const attrs = (b.width && b.height) ? ` {width=${b.width} height=${b.height}}` : '';
        return `\`\`\`${b.type}${attrs}\n${b.content}\n\`\`\``;
      }).join('');
      
      onChange(fullContent);
      return next;
    });
  }, [onChange]);

  const handleDeleteBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      
      // Reconstruct full content
      const fullContent = next.map((b) => {
        if (b.type === 'text') return b.content;
        const attrs = (b.width && b.height) ? ` {width=${b.width} height=${b.height}}` : '';
        return `\`\`\`${b.type}${attrs}\n${b.content}\n\`\`\``;
      }).join('');
      
      onChange(fullContent);
      return next;
    });
  }, [onChange]);

  const toggleRawMode = (id: string) => {
    setRawModeBlocks(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, blockId?: string, cursorIndex?: number) => {
    e.preventDefault();
    
    // Get word at cursor position if we have block content
    let wordInfo: { word: string; start: number; end: number } | null = null;
    if (blockId && cursorIndex !== undefined) {
      const block = blocks.find(b => b.id === blockId);
      if (block && block.type === 'text') {
        wordInfo = getWordAtPosition(block.content, cursorIndex);
      }
    }
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      visible: true,
      blockId,
      cursorIndex,
      wordInfo
    });
  };

  const insertEmbed = (type: 'desmos' | 'excalidraw' | 'website' | 'mermaid' | 'monaco' | 'kanban' | 'spreadsheet') => {
    if (!contextMenu) return;
    
    let insertText = '';
    if (type === 'desmos') insertText = '```desmos\n\n```';
    if (type === 'excalidraw') insertText = '```excalidraw\n\n```';
    if (type === 'website') insertText = '```website\nhttps://example.com\n```';
    if (type === 'mermaid') insertText = '```mermaid\ngraph TD;\n    A-->B;\n```';
    if (type === 'monaco') insertText = '```monaco\n// Write code here\nconsole.log("Hello World");\n```';
    if (type === 'kanban') insertText = '```kanban\n\n```';
    if (type === 'spreadsheet') insertText = '```spreadsheet\n\n```';

    if (contextMenu.blockId) {
      const block = blocks.find(b => b.id === contextMenu.blockId);
      if (block && block.type === 'text') {
        const normalized = block.content.replace(/\r\n/g, '\n');
        const rawIndex = contextMenu.cursorIndex !== undefined ? contextMenu.cursorIndex : normalized.length;
        const index = Math.max(0, Math.min(rawIndex, normalized.length));

        const before = normalized.slice(0, index);
        const after = normalized.slice(index);

        const needsLeadingNewline = before.length > 0 && !before.endsWith('\n');
        const needsTrailingNewline = after.length > 0 && !after.startsWith('\n');

        const newContent =
          before +
          (needsLeadingNewline ? '\n' : '') +
          insertText +
          (needsTrailingNewline ? '\n' : '') +
          after;

        handleBlockChange(block.id, newContent);
      } else {
        // Append to end if not text block
        onChange(content + insertText);
      }
    } else {
      onChange(content + insertText);
    }
  };

  // Replace a word with a suggestion
  const replaceWord = (replacement: string) => {
    if (!contextMenu?.blockId || !contextMenu.wordInfo) return;
    
    const block = blocks.find(b => b.id === contextMenu.blockId);
    if (block && block.type === 'text') {
      const { start, end } = contextMenu.wordInfo;
      const newContent = block.content.slice(0, start) + replacement + block.content.slice(end);
      handleBlockChange(block.id, newContent);
    }
  };

  // Build menu options dynamically to include spell suggestions
  const menuOptions: ContextMenuOption[] = useMemo(() => {
    const options: ContextMenuOption[] = [];
    
    // Add spell suggestions if we have a word that might be misspelled
    if (contextMenu?.wordInfo) {
      const { word } = contextMenu.wordInfo;
      const suggestions = getSpellingSuggestions(word);
      
      if (suggestions.length > 0) {
        options.push({
          label: 'Spelling Suggestions',
          icon: <SpellCheck size={14} />,
          submenu: suggestions.map(suggestion => ({
            label: suggestion,
            action: () => replaceWord(suggestion)
          }))
        });
        options.push({ separator: true, label: '' });
      }
    }
    
    options.push(
      { label: 'Add link', icon: <Link size={14} />, shortcut: 'Ctrl+K' },
      { label: 'Add external link', icon: <ExternalLink size={14} /> },
      { separator: true, label: '' },
      { 
        label: 'Format', 
        icon: <Type size={14} />,
        submenu: [
          { label: 'Bold', shortcut: 'Ctrl+B' },
          { label: 'Italic', shortcut: 'Ctrl+I' },
        ]
      },
      { 
        label: 'Paragraph', 
        icon: <AlignLeft size={14} />,
        submenu: [
          { label: 'Heading 1' },
          { label: 'Heading 2' },
          { label: 'Normal Text' },
        ]
      },
      { 
        label: 'Insert', 
        icon: <Plus size={14} />,
        submenu: [
          { label: 'Desmos', action: () => insertEmbed('desmos') },
          { label: 'Excalidraw', action: () => insertEmbed('excalidraw') },
          { label: 'Website', action: () => insertEmbed('website') },
          { label: 'Mermaid', action: () => insertEmbed('mermaid') },
          { label: 'Code (Monaco)', action: () => insertEmbed('monaco') },
          { label: 'Kanban', action: () => insertEmbed('kanban') },
          { label: 'Spreadsheet', action: () => insertEmbed('spreadsheet') },
        ]
      },
      { separator: true, label: '' },
      { label: 'Cut', icon: <Scissors size={14} />, shortcut: 'Ctrl+X' },
      { label: 'Copy', icon: <Copy size={14} />, shortcut: 'Ctrl+C' },
      { label: 'Paste', icon: <Clipboard size={14} />, shortcut: 'Ctrl+V' },
      { label: 'Paste as plain text', shortcut: 'Ctrl+Shift+V' },
      { label: 'Select all', shortcut: 'Ctrl+A' },
    );
    
    return options;
  }, [contextMenu]);

  // Only use h-full for single text block - when mixed with embeds, use normal flow
  const isSingleTextBlock = blocks.length === 1 && blocks[0].type === 'text';
  
  // Find the first text block index to show toolbar only on it
  const firstTextBlockIndex = blocks.findIndex(b => b.type === 'text');

  const handleVerticalBoundary = useCallback((currentBlockId: string, direction: 'up' | 'down', column: number) => {
    const textBlocks = blocks.filter((block) => block.type === 'text');
    const currentIndex = textBlocks.findIndex((block) => block.id === currentBlockId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= textBlocks.length) return;

    const targetBlock = textBlocks[targetIndex];
    setFocusRequest({
      blockId: targetBlock.id,
      token: Date.now(),
      position: direction === 'up' ? 'end' : 'start',
      column,
    });
  }, [blocks]);

  const handleFocusRequestHandled = useCallback((token: number) => {
    setFocusRequest((current) => (current && current.token === token ? null : current));
  }, []);
  
  // Check if there are any embeds in the document
  const hasEmbeds = blocks.some(b => b.type !== 'text');
  
  // Get file name from activeFile
  const fileName = useMemo(() => {
    if (!activeFile) return 'Untitled';
    const name = activeFile.split(/[/\\]/).pop() || 'Untitled';
    return name.replace(/\.md$/i, '');
  }, [activeFile]);

  return (
    <div 
      className="w-full h-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden"
      onContextMenu={(e) => handleContextMenu(e)}
    >
      {/* File title header - shown at Editor level when there are embeds in live mode */}
      {hasEmbeds && viewMode === 'live' && (
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">{fileName}</h1>
        </div>
      )}
      
      {/* Edit mode: single text block with full content */}
      {viewMode === 'edit' ? (
        <div className="flex-1 overflow-y-auto">
          <TextBlock 
            content={content} 
            onChange={onChange} 
            filePath={activeFile || undefined}
            fullHeight={false}
            showHeader={true}
            showToolbar={true}
            viewMode="edit"
            onViewModeChange={(mode) => {
              if (mode === 'live' || mode === 'edit') {
                setViewMode(mode);
              }
            }}
          />
        </div>
      ) : (
        /* Live mode: separate blocks for text and embeds */
        <div className="flex-1 overflow-y-auto px-4">
          {blocks.map((block, index) => (
            <div key={block.id} className={block.type === 'text' && isSingleTextBlock ? 'h-full' : ''}>
              {block.type === 'text' && (
                <TextBlock 
                  content={block.content} 
                  onChange={(c: string) => handleBlockChange(block.id, c)} 
                  filePath={activeFile || undefined}
                  fullHeight={isSingleTextBlock}
                  showHeader={!hasEmbeds}
                  showToolbar={!hasEmbeds || index === firstTextBlockIndex}
                  onVerticalBoundary={(direction, column) => handleVerticalBoundary(block.id, direction, column)}
                  focusRequest={focusRequest?.blockId === block.id ? { token: focusRequest.token, position: focusRequest.position, column: focusRequest.column } : null}
                  onFocusRequestHandled={handleFocusRequestHandled}
                  onContextMenu={(e: React.MouseEvent, idx?: number) => {
                    e.stopPropagation();
                    handleContextMenu(e, block.id, idx);
                  }}
                  viewMode={viewMode}
                  onViewModeChange={(mode) => {
                    if (mode === 'live' || mode === 'edit') {
                      setViewMode(mode);
                    }
                  }}
                />
              )}
              {block.type === 'website' && (
                <ResizableWrapper 
                  width={block.width} 
                  height={block.height} 
                  onResize={(w, h) => handleBlockChange(block.id, block.content, w, h)}
                  onToggleRaw={() => toggleRawMode(block.id)}
                  onDelete={() => handleDeleteBlock(block.id)}
                >
                  {rawModeBlocks.has(block.id) ? (
                    <textarea 
                      className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none outline-none border-none"
                      value={block.content}
                      onChange={(e) => handleBlockChange(block.id, e.target.value)}
                    />
                  ) : (
                    <WebsiteEmbed url={block.content.trim()} />
                  )}
                </ResizableWrapper>
              )}
              {block.type === 'desmos' && (
                <ResizableWrapper 
                  width={block.width} 
                  height={block.height} 
                  onResize={(w, h) => handleBlockChange(block.id, block.content, w, h)}
                  onToggleRaw={() => toggleRawMode(block.id)}
                  onDelete={() => handleDeleteBlock(block.id)}
                >
                  {rawModeBlocks.has(block.id) ? (
                    <textarea 
                      className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none outline-none border-none"
                      value={block.content}
                      onChange={(e) => handleBlockChange(block.id, e.target.value)}
                    />
                  ) : (
                    <DesmosEmbed stateString={block.content} onChange={(c) => handleBlockChange(block.id, c)} />
                  )}
                </ResizableWrapper>
              )}
              {block.type === 'excalidraw' && (
                <ResizableWrapper 
                  width={block.width} 
                  height={block.height} 
                  onResize={(w, h) => handleBlockChange(block.id, block.content, w, h)}
                  onToggleRaw={() => toggleRawMode(block.id)}
                  onDelete={() => handleDeleteBlock(block.id)}
                >
                  {rawModeBlocks.has(block.id) ? (
                    <textarea 
                      className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none outline-none border-none"
                      value={block.content}
                      onChange={(e) => handleBlockChange(block.id, e.target.value)}
                    />
                  ) : (
                    <ExcalidrawEmbed dataString={block.content} onChange={(c) => handleBlockChange(block.id, c)} />
                  )}
                </ResizableWrapper>
              )}
              {block.type === 'mermaid' && (
                <ResizableWrapper 
                  width={block.width} 
                  height={block.height} 
                  onResize={(w, h) => handleBlockChange(block.id, block.content, w, h)}
                  onToggleRaw={() => toggleRawMode(block.id)}
                  onDelete={() => handleDeleteBlock(block.id)}
                >
                  {rawModeBlocks.has(block.id) ? (
                    <textarea 
                      className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none outline-none border-none"
                      value={block.content}
                      onChange={(e) => handleBlockChange(block.id, e.target.value)}
                    />
                  ) : (
                    <MermaidEmbed definition={block.content} onChange={(c) => handleBlockChange(block.id, c)} />
                  )}
                </ResizableWrapper>
              )}
              {block.type === 'monaco' && (
                <ResizableWrapper 
                  width={block.width} 
                  height={block.height} 
                  onResize={(w, h) => handleBlockChange(block.id, block.content, w, h)}
                  onToggleRaw={() => toggleRawMode(block.id)}
                  onDelete={() => handleDeleteBlock(block.id)}
                >
                  {rawModeBlocks.has(block.id) ? (
                    <textarea 
                      className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none outline-none border-none"
                      value={block.content}
                      onChange={(e) => handleBlockChange(block.id, e.target.value)}
                    />
                  ) : (
                    <MonacoEmbed code={block.content} onChange={(c) => handleBlockChange(block.id, c)} />
                  )}
                </ResizableWrapper>
              )}
              {block.type === 'kanban' && (
                <ResizableWrapper 
                  width={block.width} 
                  height={block.height} 
                  onResize={(w, h) => handleBlockChange(block.id, block.content, w, h)}
                  onToggleRaw={() => toggleRawMode(block.id)}
                  onDelete={() => handleDeleteBlock(block.id)}
                >
                  {rawModeBlocks.has(block.id) ? (
                    <textarea 
                      className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none outline-none border-none"
                      value={block.content}
                      onChange={(e) => handleBlockChange(block.id, e.target.value)}
                    />
                  ) : (
                    <KanbanEmbed dataString={block.content} onChange={(c) => handleBlockChange(block.id, c)} />
                  )}
                </ResizableWrapper>
              )}
              {block.type === 'spreadsheet' && (
                <ResizableWrapper 
                  width={block.width} 
                  height={block.height} 
                  onResize={(w, h) => handleBlockChange(block.id, block.content, w, h)}
                  onToggleRaw={() => toggleRawMode(block.id)}
                  onDelete={() => handleDeleteBlock(block.id)}
                >
                  {rawModeBlocks.has(block.id) ? (
                    <textarea 
                      className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none outline-none border-none"
                      value={block.content}
                      onChange={(e) => handleBlockChange(block.id, e.target.value)}
                    />
                  ) : (
                    <SpreadsheetEmbed dataString={block.content} onChange={(c) => handleBlockChange(block.id, c)} />
                  )}
                </ResizableWrapper>
              )}
            </div>
          ))}
        </div>
      )}
      
      {contextMenu && contextMenu.visible && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          options={menuOptions} 
          onClose={() => setContextMenu(null)} 
        />
      )}
      
      {/* Status Bar */}
      {showStatusBar && (
        <div className="shrink-0 flex items-center justify-between px-6 py-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>{stats.wordCount} words</span>
            <span>{stats.charCount} characters</span>
          </div>
          <div className="flex items-center gap-4">
            <span>~{stats.readingTime} min read</span>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Link, ExternalLink, Scissors, Copy, Clipboard, Type, AlignLeft, Plus, GripHorizontal, Code, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/store';
import { saveImage } from '../../lib/fileSystem';

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
    <div className="relative group border border-transparent hover:border-gray-200 dark:hover:border-gray-700 rounded p-1" style={{ width: dims.width, height: dims.height }}>
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
}

interface Block {
  id: string;
  type: 'text' | 'website' | 'desmos' | 'excalidraw' | 'mermaid' | 'monaco' | 'kanban' | 'spreadsheet';
  content: string;
  width?: number;
  height?: number;
}

export const Editor: React.FC<EditorProps> = ({ content, onChange }) => {
  const { currentPath } = useAppStore();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean; blockId?: string; cursorIndex?: number } | null>(null);
  const [rawModeBlocks, setRawModeBlocks] = useState<Set<string>>(new Set());

  // Parse content into blocks
  useEffect(() => {
    const newBlocks: Block[] = [];
    // Regex to match block type and optional attributes like {width=500 height=300}
    const regex = /```(website|desmos|excalidraw|mermaid|monaco|kanban|spreadsheet)(?: \{width=(\d+) height=(\d+)\})?\n([\s\S]*?)\n```/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      // Add text before the block
      if (match.index > lastIndex) {
        newBlocks.push({
          id: uuidv4(),
          type: 'text',
          content: content.substring(lastIndex, match.index),
        });
      }

      // Add the special block
      newBlocks.push({
        id: uuidv4(),
        type: match[1] as any,
        content: match[4], // Content is now group 4
        width: match[2] ? parseInt(match[2]) : undefined,
        height: match[3] ? parseInt(match[3]) : undefined,
      });

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      newBlocks.push({
        id: uuidv4(),
        type: 'text',
        content: content.substring(lastIndex),
      });
    }

    // If empty, add one text block
    if (newBlocks.length === 0) {
      newBlocks.push({ id: uuidv4(), type: 'text', content: '' });
    }

    setBlocks(newBlocks);
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
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      visible: true,
      blockId,
      cursorIndex
    });
  };

  const insertEmbed = (type: 'desmos' | 'excalidraw' | 'website' | 'mermaid' | 'monaco' | 'kanban' | 'spreadsheet') => {
    if (!contextMenu) return;
    
    let insertText = '';
    if (type === 'desmos') insertText = '\n```desmos\n\n```\n';
    if (type === 'excalidraw') insertText = '\n```excalidraw\n\n```\n';
    if (type === 'website') insertText = '\n```website\nhttps://example.com\n```\n';
    if (type === 'mermaid') insertText = '\n```mermaid\ngraph TD;\n    A-->B;\n```\n';
    if (type === 'monaco') insertText = '\n```monaco\n// Write code here\nconsole.log("Hello World");\n```\n';
    if (type === 'kanban') insertText = '\n```kanban\n\n```\n';
    if (type === 'spreadsheet') insertText = '\n```spreadsheet\n\n```\n';

    if (contextMenu.blockId) {
      const block = blocks.find(b => b.id === contextMenu.blockId);
      if (block && block.type === 'text') {
        const index = contextMenu.cursorIndex !== undefined ? contextMenu.cursorIndex : block.content.length;
        const newContent = block.content.slice(0, index) + insertText + block.content.slice(index);
        handleBlockChange(block.id, newContent);
      } else {
        // Append to end if not text block
        onChange(content + insertText);
      }
    } else {
      onChange(content + insertText);
    }
  };

  const menuOptions: ContextMenuOption[] = [
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
  ];

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (blob && currentPath) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            if (event.target?.result) {
              const arrayBuffer = event.target.result as ArrayBuffer;
              const uint8Array = new Uint8Array(arrayBuffer);
              const fileName = `image-${Date.now()}.png`;
              const fullPath = `${currentPath}\\${fileName}`;
              
              try {
                await saveImage(fullPath, uint8Array);
                // Insert markdown image
                const imageMarkdown = `\n![${fileName}](${fileName})\n`;
                
                // Find where to insert (at end for now, or focused block if I could track it)
                // For simplicity, appending to content
                onChange(content + imageMarkdown);
              } catch (err) {
                console.error("Failed to save pasted image", err);
              }
            }
          };
          reader.readAsArrayBuffer(blob);
        }
        return; // Handle only the first image
      }
    }
  };

  return (
    <div 
      className="w-full h-full overflow-y-auto p-8 space-y-4"
      onContextMenu={(e) => handleContextMenu(e)}
      onPaste={handlePaste}
    >
      {blocks.map((block) => (
        <div key={block.id}>
          {block.type === 'text' && (
            <TextBlock 
              content={block.content} 
              onChange={(c) => handleBlockChange(block.id, c)} 
              onContextMenu={(e, idx) => {
                e.stopPropagation();
                handleContextMenu(e, block.id, idx);
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
                  className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 resize-none outline-none border-none"
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
                  className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 resize-none outline-none border-none"
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
                  className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 resize-none outline-none border-none"
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
                  className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 resize-none outline-none border-none"
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
                  className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 resize-none outline-none border-none"
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
                  className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 resize-none outline-none border-none"
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
                  className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 resize-none outline-none border-none"
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
      
      {contextMenu && contextMenu.visible && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          options={menuOptions} 
          onClose={() => setContextMenu(null)} 
        />
      )}
    </div>
  );
};

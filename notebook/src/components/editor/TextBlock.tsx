import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppStore, FileEntry } from '../../store/store';
import { readFileContent } from '../../lib/fileSystem';

// Embedded file component
const EmbeddedFile: React.FC<{ 
  filePath: string; 
  fileName: string;
  onNavigate?: (path: string) => void;
}> = ({ filePath, fileName, onNavigate }) => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fileContents, setActiveFile } = useAppStore();

  useEffect(() => {
    const loadContent = async () => {
      // Check if content is already cached
      if (fileContents[filePath]) {
        setContent(fileContents[filePath]);
        setLoading(false);
        return;
      }
      
      try {
        const data = await readFileContent(filePath);
        setContent(data);
      } catch (e) {
        setError('Failed to load file');
      }
      setLoading(false);
    };
    loadContent();
  }, [filePath, fileContents]);

  const handleClick = () => {
    if (onNavigate) {
      onNavigate(filePath);
    } else {
      setActiveFile(filePath);
    }
  };

  if (loading) {
    return <div className="p-2 text-gray-400 text-sm">Loading {fileName}...</div>;
  }

  if (error || content === null) {
    return (
      <div className="p-2 border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm">
        Could not embed: {fileName}
      </div>
    );
  }

  const ext = fileName.split('.').pop()?.toLowerCase();

  // Handle different file types
  if (ext === 'md') {
    return (
      <div 
        className="border-l-4 border-blue-400 pl-4 py-2 my-2 bg-gray-50 dark:bg-gray-800/50 rounded-r cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={handleClick}
        title={`Click to open ${fileName}`}
      >
        <div className="text-xs text-gray-500 mb-1 font-medium">{fileName}</div>
        <div className="prose dark:prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  if (ext === 'mermaid') {
    // Dynamic import would be better, but for now show code preview
    return (
      <div 
        className="border border-gray-200 dark:border-gray-700 rounded my-2 cursor-pointer hover:border-blue-400"
        onClick={handleClick}
        title={`Click to open ${fileName}`}
      >
        <div className="text-xs text-gray-500 px-3 py-1 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 font-medium">
          📊 {fileName}
        </div>
        <pre className="p-3 text-sm overflow-x-auto bg-gray-50 dark:bg-gray-900">{content}</pre>
      </div>
    );
  }

  if (ext === 'excalidraw') {
    return (
      <div 
        className="border border-gray-200 dark:border-gray-700 rounded my-2 cursor-pointer hover:border-blue-400"
        onClick={handleClick}
        title={`Click to open ${fileName}`}
      >
        <div className="text-xs text-gray-500 px-3 py-2 bg-gray-100 dark:bg-gray-800 font-medium flex items-center gap-2">
          ✏️ {fileName}
          <span className="text-blue-500">(click to edit)</span>
        </div>
      </div>
    );
  }

  if (ext === 'kanban') {
    return (
      <div 
        className="border border-gray-200 dark:border-gray-700 rounded my-2 cursor-pointer hover:border-blue-400"
        onClick={handleClick}
        title={`Click to open ${fileName}`}
      >
        <div className="text-xs text-gray-500 px-3 py-2 bg-gray-100 dark:bg-gray-800 font-medium flex items-center gap-2">
          📋 {fileName}
          <span className="text-blue-500">(click to open board)</span>
        </div>
      </div>
    );
  }

  // Code files
  if (['js', 'ts', 'tsx', 'py', 'json', 'css', 'html'].includes(ext || '')) {
    return (
      <div 
        className="border border-gray-200 dark:border-gray-700 rounded my-2 cursor-pointer hover:border-blue-400"
        onClick={handleClick}
        title={`Click to open ${fileName}`}
      >
        <div className="text-xs text-gray-500 px-3 py-1 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 font-medium">
          💻 {fileName}
        </div>
        <pre className="p-3 text-sm overflow-x-auto bg-gray-50 dark:bg-gray-900 max-h-60">{content}</pre>
      </div>
    );
  }

  // Default: show as text
  return (
    <div 
      className="border border-gray-200 dark:border-gray-700 rounded my-2 cursor-pointer hover:border-blue-400"
      onClick={handleClick}
      title={`Click to open ${fileName}`}
    >
      <div className="text-xs text-gray-500 px-3 py-1 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 font-medium">
        📄 {fileName}
      </div>
      <pre className="p-3 text-sm overflow-x-auto bg-gray-50 dark:bg-gray-900 max-h-40">{content}</pre>
    </div>
  );
};

interface TextBlockProps {
  content: string;
  onChange: (newContent: string) => void;
  onContextMenu?: (e: React.MouseEvent, cursorIndex?: number) => void;
  onNavigate?: (path: string) => void;
}

// Flatten file structure to a list of files with depth
const flattenFiles = (entries: FileEntry[], depth = 0): { name: string; path: string; depth: number }[] => {
  const result: { name: string; path: string; depth: number }[] = [];
  for (const entry of entries) {
    if (entry.isDirectory && entry.children) {
      result.push(...flattenFiles(entry.children, depth + 1));
    } else {
      result.push({ name: entry.name, path: entry.path, depth });
    }
  }
  // Sort by depth (higher in hierarchy = lower depth = higher priority)
  return result.sort((a, b) => a.depth - b.depth);
};

// Find best match for a link name (prioritize by hierarchy depth)
const findFileByLinkName = (linkName: string, files: { name: string; path: string; depth: number }[]): string | null => {
  const normalizedLink = linkName.toLowerCase();
  const match = files.find(f => 
    f.name.toLowerCase() === normalizedLink || 
    f.name.toLowerCase() === `${normalizedLink}.md`
  );
  return match?.path || null;
};

export const TextBlock: React.FC<TextBlockProps> = ({ content, onChange, onContextMenu, onNavigate }) => {
  const { fileStructure, setActiveFile } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [flatFiles, setFlatFiles] = useState<{ name: string; path: string; depth: number }[]>([]);

  useEffect(() => {
    setValue(content);
  }, [content]);

  useEffect(() => {
    setFlatFiles(flattenFiles(fileStructure));
  }, [fileStructure]);

  // Format action handler
  useEffect(() => {
    const handleFormat = (e: CustomEvent<{ action: string }>) => {
      if (!isEditing || !textareaRef.current) return;
      
      const textarea = textareaRef.current;
      const { selectionStart, selectionEnd } = textarea;
      const selectedText = value.substring(selectionStart, selectionEnd);
      const before = value.substring(0, selectionStart);
      const after = value.substring(selectionEnd);
      
      let newValue = value;
      let newCursorPos = selectionStart;
      
      const formatMap: Record<string, { prefix: string; suffix: string; block?: boolean }> = {
        'bold': { prefix: '**', suffix: '**' },
        'italic': { prefix: '*', suffix: '*' },
        'strikethrough': { prefix: '~~', suffix: '~~' },
        'inline-code': { prefix: '`', suffix: '`' },
        'subscript': { prefix: '~', suffix: '~' },
        'superscript': { prefix: '^', suffix: '^' },
        'link-file': { prefix: '[[', suffix: ']]' },
        'embed-file': { prefix: '![[', suffix: ']]' },
        'link-external': { prefix: '[', suffix: '](url)' },
      };

      const blockFormatMap: Record<string, string> = {
        'h1': '# ',
        'h2': '## ',
        'h3': '### ',
        'h4': '#### ',
        'h5': '##### ',
        'h6': '###### ',
        'blockquote': '> ',
        'code-block': '```\n',
        'hr': '\n---\n',
        'table': '\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n',
        'footnote': '[^1]\n\n[^1]: ',
      };

      const action = e.detail.action;
      
      if (formatMap[action]) {
        const { prefix, suffix } = formatMap[action];
        if (selectedText) {
          newValue = before + prefix + selectedText + suffix + after;
          newCursorPos = selectionStart + prefix.length + selectedText.length + suffix.length;
        } else {
          newValue = before + prefix + suffix + after;
          newCursorPos = selectionStart + prefix.length;
        }
      } else if (blockFormatMap[action]) {
        const syntax = blockFormatMap[action];
        if (action === 'code-block') {
          if (selectedText) {
            newValue = before + '```\n' + selectedText + '\n```' + after;
          } else {
            newValue = before + '```\n\n```' + after;
            newCursorPos = selectionStart + 4;
          }
        } else {
          // For line-level formatting, find the start of the line
          const lineStart = before.lastIndexOf('\n') + 1;
          const linePrefix = before.substring(lineStart);
          newValue = before.substring(0, lineStart) + syntax + linePrefix + selectedText + after;
          newCursorPos = lineStart + syntax.length + linePrefix.length + selectedText.length;
        }
      }
      
      if (newValue !== value) {
        setValue(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = newCursorPos;
          textarea.focus();
        }, 0);
      }
    };

    window.addEventListener('editor-format', handleFormat as EventListener);
    return () => window.removeEventListener('editor-format', handleFormat as EventListener);
  }, [isEditing, value]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleBlur = () => {
    // Delay to allow autocomplete click
    setTimeout(() => {
      if (!showAutocomplete) {
        setIsEditing(false);
        if (value !== content) {
          onChange(value);
        }
      }
    }, 150);
  };

  // Auto-close brackets
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const pairs: Record<string, string> = { '[': ']', '(': ')', '{': '}' };

    if (pairs[e.key]) {
      e.preventDefault();
      const before = value.substring(0, selectionStart);
      const selected = value.substring(selectionStart, selectionEnd);
      const after = value.substring(selectionEnd);
      const newValue = before + e.key + selected + pairs[e.key] + after;
      setValue(newValue);
      
      // Position cursor after opening bracket
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      }, 0);
      return;
    }

    // Handle autocomplete navigation
    if (showAutocomplete) {
      const filteredFiles = flatFiles.filter(f => 
        f.name.toLowerCase().includes(autocompleteQuery.toLowerCase())
      ).slice(0, 10);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredFiles.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredFiles[selectedIndex]) {
          insertAutocomplete(filteredFiles[selectedIndex].name);
        }
        return;
      }
      if (e.key === 'Escape') {
        setShowAutocomplete(false);
        return;
      }
    }
  };

  const insertAutocomplete = (fileName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Find the [[ before cursor and replace with [[fileName]]
    const pos = textarea.selectionStart;
    const textBefore = value.substring(0, pos);
    const bracketPos = textBefore.lastIndexOf('[[');
    
    if (bracketPos !== -1) {
      // Remove .md extension for cleaner links
      const linkName = fileName.replace(/\.md$/i, '');
      const before = value.substring(0, bracketPos);
      const after = value.substring(pos);
      // Check if there's already a ]] after
      const newValue = before + '[[' + linkName + ']]' + after.replace(/^\]\]/, '');
      setValue(newValue);
      
      setTimeout(() => {
        const newPos = bracketPos + linkName.length + 4;
        textarea.selectionStart = textarea.selectionEnd = newPos;
        textarea.focus();
      }, 0);
    }
    
    setShowAutocomplete(false);
    setSelectedIndex(0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';

    // Check for [[ autocomplete trigger
    const pos = e.target.selectionStart;
    const textBefore = newValue.substring(0, pos);
    const bracketMatch = textBefore.match(/\[\[([^\]]*?)$/);
    
    if (bracketMatch) {
      setAutocompleteQuery(bracketMatch[1]);
      setShowAutocomplete(true);
      setSelectedIndex(0);
      
      // Calculate position (approximate)
      const lines = textBefore.split('\n');
      const lineHeight = 24;
      const charWidth = 8;
      setAutocompletePosition({
        top: lines.length * lineHeight + 30,
        left: Math.min((lines[lines.length - 1].length) * charWidth, 300)
      });
    } else {
      setShowAutocomplete(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault();
      let cursorIndex = undefined;
      if (isEditing && textareaRef.current) {
        cursorIndex = textareaRef.current.selectionStart;
      }
      onContextMenu(e, cursorIndex);
    }
  };

  // Handle wikilink clicks
  const handleLinkClick = useCallback((linkName: string) => {
    const targetPath = findFileByLinkName(linkName, flatFiles);
    if (targetPath) {
      if (onNavigate) {
        onNavigate(targetPath);
      } else {
        setActiveFile(targetPath);
      }
    }
  }, [flatFiles, onNavigate, setActiveFile]);

  // Custom renderer for wikilinks and embeds in markdown
  const renderContent = (text: string): React.ReactNode[] => {
    // Split by both embeds ![[...]] and links [[...]]
    const parts = text.split(/(!\[\[.*?\]\]|\[\[.*?\]\])/g);
    return parts.map((part, i) => {
      // Check for embed syntax ![[filename]]
      const embedMatch = part.match(/^!\[\[(.*?)\]\]$/);
      if (embedMatch) {
        const embedName = embedMatch[1];
        const targetPath = findFileByLinkName(embedName, flatFiles);
        if (targetPath) {
          return (
            <EmbeddedFile 
              key={i} 
              filePath={targetPath} 
              fileName={embedName}
              onNavigate={onNavigate}
            />
          );
        }
        return (
          <div key={i} className="p-2 border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm my-2">
            Embed not found: {embedName}
          </div>
        );
      }
      
      // Check for link syntax [[filename]]
      const linkMatch = part.match(/^\[\[(.*?)\]\]$/);
      if (linkMatch) {
        const linkName = linkMatch[1];
        const targetPath = findFileByLinkName(linkName, flatFiles);
        return (
          <span
            key={i}
            className={`cursor-pointer font-medium ${targetPath ? 'text-blue-500 hover:text-blue-600 hover:underline' : 'text-red-400'}`}
            onClick={(e) => {
              e.stopPropagation();
              handleLinkClick(linkName);
            }}
            title={targetPath || 'File not found'}
          >
            {linkName}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Filter files for autocomplete
  const filteredFiles = flatFiles.filter(f => 
    f.name.toLowerCase().includes(autocompleteQuery.toLowerCase())
  ).slice(0, 10);

  return (
    <div 
      className="w-full min-h-[2rem] p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors relative"
      onContextMenu={handleContextMenu}
    >
      {isEditing ? (
        <>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onDragStart={(e) => e.preventDefault()}
            draggable={false}
            className="w-full bg-transparent outline-none resize-none font-mono"
            rows={1}
          />
          {showAutocomplete && filteredFiles.length > 0 && (
            <div 
              className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto"
              style={{ top: autocompletePosition.top, left: autocompletePosition.left }}
            >
              {filteredFiles.map((file, idx) => (
                <div
                  key={file.path}
                  className={`px-3 py-2 cursor-pointer text-sm ${idx === selectedIndex ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertAutocomplete(file.name);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="font-medium">{file.name}</div>
                  <div className="text-xs opacity-60 truncate">{file.path}</div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div onClick={() => setIsEditing(true)} className="prose dark:prose-invert max-w-none cursor-text min-h-[1rem]">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p>{React.Children.map(children, child => 
                typeof child === 'string' ? renderContent(child) : child
              )}</p>,
              li: ({ children }) => <li>{React.Children.map(children, child => 
                typeof child === 'string' ? renderContent(child) : child
              )}</li>,
              td: ({ children }) => <td>{React.Children.map(children, child => 
                typeof child === 'string' ? renderContent(child) : child
              )}</td>,
            }}
          >
            {value}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

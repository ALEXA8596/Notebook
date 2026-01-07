import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, Pencil, GitBranch, Kanban, Table, Code, File } from 'lucide-react';
import { useAppStore, FileEntry } from '../store/store';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFile: (path: string) => void;
}

interface FileItem {
  path: string;
  name: string;
  parentFolder: string;
}

// Get icon based on file extension
const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md': return FileText;
    case 'excalidraw': return Pencil;
    case 'mermaid': return GitBranch;
    case 'kanban': return Kanban;
    case 'sheet': return Table;
    case 'js':
    case 'ts':
    case 'tsx':
    case 'py':
    case 'json':
      return Code;
    default: return File;
  }
};

// Simple fuzzy match scoring
const fuzzyMatch = (query: string, text: string): number => {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  
  // Exact match gets highest score
  if (lowerText === lowerQuery) return 100;
  
  // Starts with query
  if (lowerText.startsWith(lowerQuery)) return 80;
  
  // Contains query as substring
  if (lowerText.includes(lowerQuery)) return 60;
  
  // Fuzzy character match
  let score = 0;
  let queryIdx = 0;
  for (let i = 0; i < lowerText.length && queryIdx < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIdx]) {
      score += 10;
      queryIdx++;
    }
  }
  
  return queryIdx === lowerQuery.length ? score : 0;
};

export const QuickSwitcher: React.FC<QuickSwitcherProps> = ({ isOpen, onClose, onOpenFile }) => {
  const { fileStructure, recentFiles } = useAppStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Flatten file structure
  const allFiles = useMemo(() => {
    const files: FileItem[] = [];
    const traverse = (entries: FileEntry[], parentPath = '') => {
      for (const entry of entries) {
        if (entry.isDirectory && entry.children) {
          traverse(entry.children, entry.name);
        } else {
          files.push({
            path: entry.path,
            name: entry.name,
            parentFolder: parentPath
          });
        }
      }
    };
    traverse(fileStructure);
    return files;
  }, [fileStructure]);

  // Filter and sort by fuzzy match score
  const filteredFiles = useMemo(() => {
    if (!query.trim()) {
      // Show recent files first, then other files
      const recentSet = new Set(recentFiles);
      const recent = recentFiles
        .map(path => allFiles.find(f => f.path === path))
        .filter(Boolean) as FileItem[];
      
      const others = allFiles
        .filter(f => !recentSet.has(f.path))
        .slice(0, 20 - recent.length);
      
      return [...recent, ...others].slice(0, 20);
    }
    
    return allFiles
      .map(file => ({ 
        ...file, 
        score: fuzzyMatch(query, file.name),
        // Boost score for recent files
        isRecent: recentFiles.includes(file.path)
      }))
      .filter(file => file.score > 0)
      .sort((a, b) => {
        // Boost recent files slightly
        const aBoost = a.isRecent ? 5 : 0;
        const bBoost = b.isRecent ? 5 : 0;
        return (b.score + bBoost) - (a.score + aBoost);
      })
      .slice(0, 20);
  }, [query, allFiles]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredFiles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredFiles[selectedIndex]) {
        onOpenFile(filteredFiles[selectedIndex].path);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm" 
      onClick={onClose}
    >
      <div 
        className="w-[500px] max-h-[60vh] flex flex-col bg-white dark:bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type to search files..."
            className="w-full bg-transparent outline-none text-lg"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {filteredFiles.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {query ? 'No files found' : 'No files in workspace'}
            </div>
          ) : (
            filteredFiles.map((file, idx) => {
              const Icon = getFileIcon(file.name);
              return (
                <div
                  key={file.path}
                  className={`px-4 py-2 cursor-pointer flex items-center gap-3 ${
                    idx === selectedIndex 
                      ? 'bg-blue-500 text-white' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => {
                    onOpenFile(file.path);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <Icon size={16} className={idx === selectedIndex ? 'text-white' : 'text-gray-500'} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{file.name}</div>
                    {file.parentFolder && (
                      <div className={`text-xs truncate ${idx === selectedIndex ? 'text-blue-100' : 'text-gray-400'}`}>
                        {file.parentFolder}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 flex gap-4">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
};

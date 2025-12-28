import React, { useState, useEffect, useRef } from 'react';
import { Search, File, X } from 'lucide-react';
import { useAppStore } from '../store/store';
import { readFileContent } from '../lib/fileSystem';

interface SearchResult {
  path: string;
  name: string;
  matches: string[];
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFile: (path: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onOpenFile }) => {
  const { fileStructure } = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const searchFiles = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      const newResults: SearchResult[] = [];
      
      // Flatten files
      const files: { path: string; name: string }[] = [];
      const traverse = (entries: any[]) => {
        for (const entry of entries) {
          if (entry.isDirectory) {
            if (entry.children) traverse(entry.children);
          } else {
            files.push({ path: entry.path, name: entry.name });
          }
        }
      };
      traverse(fileStructure);

      // Search content
      for (const file of files) {
        // Skip binary files for text search performance/safety
        if (file.name.match(/\.(png|jpg|jpeg|gif|pdf|ico)$/i)) continue;

        try {
          const content = await readFileContent(file.path);
          if (content.toLowerCase().includes(query.toLowerCase())) {
            // Find context
            const index = content.toLowerCase().indexOf(query.toLowerCase());
            const start = Math.max(0, index - 20);
            const end = Math.min(content.length, index + query.length + 20);
            const snippet = '...' + content.substring(start, end) + '...';
            
            newResults.push({
              path: file.path,
              name: file.name,
              matches: [snippet]
            });
          } else if (file.name.toLowerCase().includes(query.toLowerCase())) {
             newResults.push({
              path: file.path,
              name: file.name,
              matches: ['Filename match']
            });
          }
        } catch (e) {
          // Ignore read errors
        }
      }

      setResults(newResults);
      setIsSearching(false);
    };

    const timeoutId = setTimeout(searchFiles, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [query, fileStructure]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[600px] max-h-[80vh] flex flex-col bg-white dark:bg-[#1e1e1e] rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <Search className="text-gray-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-lg text-gray-800 dark:text-gray-100 placeholder-gray-400"
            placeholder="Search files..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {isSearching ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            <div className="flex flex-col gap-1">
              {results.map(result => (
                <button
                  key={result.path}
                  className="flex flex-col items-start p-3 rounded hover:bg-gray-100 dark:hover:bg-[#2d2d2d] text-left group"
                  onClick={() => {
                    onOpenFile(result.path);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                    <File size={14} />
                    {result.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-6">
                    {result.matches[0]}
                  </div>
                </button>
              ))}
            </div>
          ) : query ? (
            <div className="p-4 text-center text-gray-500">No results found</div>
          ) : (
            <div className="p-4 text-center text-gray-500">Type to search...</div>
          )}
        </div>
        
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#252526] text-xs text-gray-500 flex justify-between">
          <span>{results.length} results</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};

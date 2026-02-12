import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, File, X } from 'lucide-react';
import { useAppStore } from '../store/store';
import { readFileContent } from '../lib/fileSystem';

interface SearchResult {
  path: string;
  name: string;
  score: number;
  matches: MatchSnippet[];
  matchType: 'name' | 'path' | 'content';
}

interface MatchSnippet {
  text: string;
  highlights: Array<{ start: number; end: number }>;
}

interface FileNode {
  name: string;
  path: string;
  isDirectory?: boolean;
  children?: FileNode[];
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFile: (path: string) => void;
}

const MAX_RESULTS = 200;
const MAX_MATCHES_PER_FILE = 3;
const CONTEXT_RADIUS = 40;
const SEARCH_DEBOUNCE_MS = 200;
const CONTENT_SEARCH_MIN_CHARS = 2;
const SEARCH_CONCURRENCY = 8;

const SKIP_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'pdf', 'ico', 'svg', 'webp',
  'mp4', 'mov', 'avi', 'mkv', 'zip', 'rar', '7z', 'exe', 'dll'
];

const normalize = (value: string) => value.toLowerCase();

const flattenFiles = (entries: FileNode[]) => {
  const files: Array<{ path: string; name: string }> = [];
  const stack = [...entries];
  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) continue;
    if (entry.isDirectory) {
      if (entry.children) stack.push(...entry.children);
      continue;
    }
    files.push({ path: entry.path, name: entry.name });
  }
  return files;
};

const fuzzyScore = (query: string, target: string) => {
  let score = 0;
  let tIndex = 0;
  let streak = 0;

  for (let i = 0; i < query.length; i += 1) {
    const ch = query[i];
    const found = target.indexOf(ch, tIndex);
    if (found === -1) return null;
    if (found === tIndex) {
      streak += 1;
      score += 10 + streak * 2;
    } else {
      streak = 0;
      score += Math.max(1, 6 - (found - tIndex));
    }
    tIndex = found + 1;
  }

  const startBonus = Math.max(0, 30 - target.indexOf(query[0]));
  return score + startBonus;
};

const buildSnippet = (content: string, matchIndex: number, matchLength: number): MatchSnippet => {
  const start = Math.max(0, matchIndex - CONTEXT_RADIUS);
  const end = Math.min(content.length, matchIndex + matchLength + CONTEXT_RADIUS);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < content.length ? '...' : '';
  const text = prefix + content.slice(start, end) + suffix;
  const highlightStart = prefix.length + (matchIndex - start);
  return {
    text,
    highlights: [{ start: highlightStart, end: highlightStart + matchLength }]
  };
};

const renderHighlightedText = (snippet: MatchSnippet) => {
  if (snippet.highlights.length === 0) return snippet.text;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const highlights = [...snippet.highlights].sort((a, b) => a.start - b.start);

  highlights.forEach((hl, idx) => {
    if (hl.start > lastIndex) {
      parts.push(snippet.text.slice(lastIndex, hl.start));
    }
    parts.push(
      <mark
        key={`hl-${idx}-${hl.start}`}
        className="bg-amber-200/70 text-gray-900 rounded px-0.5"
      >
        {snippet.text.slice(hl.start, hl.end)}
      </mark>
    );
    lastIndex = hl.end;
  });

  if (lastIndex < snippet.text.length) {
    parts.push(snippet.text.slice(lastIndex));
  }

  return parts;
};

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onOpenFile }) => {
  const { fileStructure } = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState({ scanned: 0, total: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchIdRef = useRef(0);
  const contentCacheRef = useRef<Map<string, string>>(new Map());

  const files = useMemo(() => flattenFiles(fileStructure as FileNode[]), [fileStructure]);

  useEffect(() => {
    contentCacheRef.current.clear();
  }, [fileStructure]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      setProgress({ scanned: 0, total: 0 });
      return;
    }

    const searchId = searchIdRef.current + 1;
    searchIdRef.current = searchId;
    const trimmedQuery = query.trim();
    const normalizedQuery = normalize(trimmedQuery);
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
    const shouldSearchContent = normalizedQuery.length >= CONTENT_SEARCH_MIN_CHARS;

    setIsSearching(true);
    setProgress({ scanned: 0, total: files.length });

    const timeoutId = setTimeout(() => {
      const runSearch = async () => {
        const resultsBuffer: SearchResult[] = [];
        let scanned = 0;
        let nextIndex = 0;

        const nextFile = () => {
          const idx = nextIndex;
          nextIndex += 1;
          return idx;
        };

        const worker = async () => {
          while (true) {
            const idx = nextFile();
            if (idx >= files.length) return;
            if (searchIdRef.current !== searchId) return;

            const file = files[idx];
            scanned += 1;
            if (scanned % 10 === 0) {
              setProgress({ scanned, total: files.length });
            }

            const extension = file.name.split('.').pop()?.toLowerCase() || '';
            if (SKIP_EXTENSIONS.includes(extension)) continue;

            const nameLower = normalize(file.name);
            const pathLower = normalize(file.path);
            const nameIncludes = nameLower.includes(normalizedQuery);
            const pathIncludes = pathLower.includes(normalizedQuery);
            const nameTokens = tokens.filter((t) => nameLower.includes(t) || pathLower.includes(t));
            const namePathCoversAll = nameTokens.length === tokens.length;

            let score = 0;
            let matchType: SearchResult['matchType'] = 'content';
            const matches: MatchSnippet[] = [];

            if (nameIncludes) {
              score += 1000 - Math.min(200, nameLower.indexOf(normalizedQuery) * 5);
              matchType = 'name';
            } else if (pathIncludes) {
              score += 700 - Math.min(200, pathLower.indexOf(normalizedQuery) * 2);
              matchType = 'path';
            } else {
              const fuzzy = fuzzyScore(normalizedQuery, nameLower);
              if (fuzzy) {
                score += 400 + fuzzy;
                matchType = 'name';
              }
            }

            if (namePathCoversAll && score > 0) {
              resultsBuffer.push({
                path: file.path,
                name: file.name,
                score,
                matches: [{ text: 'Filename match', highlights: [] }],
                matchType
              });
              continue;
            }

            if (!shouldSearchContent) continue;

            let content = contentCacheRef.current.get(file.path);
            if (!content) {
              try {
                content = await readFileContent(file.path);
                contentCacheRef.current.set(file.path, content);
              } catch (e) {
                continue;
              }
            }

            const contentLower = normalize(content);
            const tokensInContent = tokens.every((t) => contentLower.includes(t));
            if (!tokensInContent) continue;

            const contentMatchIndex = contentLower.indexOf(normalizedQuery);
            if (contentMatchIndex >= 0) {
              matches.push(buildSnippet(content, contentMatchIndex, normalizedQuery.length));
              score += 300 - Math.min(200, contentMatchIndex * 0.02);
              matchType = score > 0 ? matchType : 'content';
            }

            for (const token of tokens) {
              if (matches.length >= MAX_MATCHES_PER_FILE) break;
              const tokenIndex = contentLower.indexOf(token);
              if (tokenIndex >= 0) {
                matches.push(buildSnippet(content, tokenIndex, token.length));
                score += 30;
              }
            }

            if (matches.length === 0) {
              matches.push({ text: 'Content match', highlights: [] });
              score += 50;
            }

            resultsBuffer.push({
              path: file.path,
              name: file.name,
              score,
              matches,
              matchType
            });
          }
        };

        await Promise.all(Array.from({ length: SEARCH_CONCURRENCY }, () => worker()));

        if (searchIdRef.current !== searchId) return;

        const sorted = resultsBuffer
          .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
          .slice(0, MAX_RESULTS);

        setResults(sorted);
        setSelectedIndex(0);
        setIsSearching(false);
        setProgress({ scanned: files.length, total: files.length });
      };

      runSearch();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [query, files, isOpen]);

  const handleOpen = useCallback((path: string) => {
    onOpenFile(path);
    onClose();
  }, [onOpenFile, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((idx) => Math.min(idx + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((idx) => Math.max(idx - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const selected = results[selectedIndex];
      if (selected) handleOpen(selected.path);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[720px] max-h-[80vh] flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <Search className="text-gray-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-lg text-gray-800 dark:text-gray-100 placeholder-gray-400"
            placeholder="Search notes and filenames..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isSearching ? (
            <div className="p-4 text-center text-gray-500">
              Searching {progress.scanned}/{progress.total} files...
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-col gap-1">
              {results.map((result, idx) => (
                <button
                  key={result.path}
                  className={`flex flex-col items-start p-3 rounded text-left border border-transparent ${
                    idx === selectedIndex
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => handleOpen(result.path)}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                    <File size={14} />
                    {result.name}
                    <span className="text-[10px] uppercase tracking-wide text-gray-400">{result.matchType}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5 pl-6 truncate">
                    {result.path}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 pl-6">
                    {renderHighlightedText(result.matches[0])}
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

        <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 flex justify-between">
          <span>{results.length} results</span>
          <span>Enter to open, Esc to close</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState, DragEvent, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, File, FilePlus, FolderPlus, ImagePlus, Folder, Pencil, GitBranch, Code, Kanban, Table, FileText, Plus, ChevronUp, Trash2, Edit2, Copy, FolderInput, ExternalLink, PanelRight, FileSpreadsheet, Globe, History, Clipboard, Scissors, Search, X, ArrowUpDown, ChevronsUpDown, FolderOpen, FolderClosed } from 'lucide-react';
import { FileEntry, useAppStore } from '../store/store';
import { createFile, createFolder, loadFileStructure, readFileContent, saveFileContent } from '../lib/fileSystem';
import clsx from 'clsx';

// File type definitions for quick create
const FILE_TYPES = [
  { extension: '.md', label: 'Markdown', icon: FileText, defaultContent: '# New Note\n\n' },
  { extension: '.excalidraw', label: 'Excalidraw', icon: Pencil, defaultContent: '{"elements":[],"appState":{}}' },
  { extension: '.mermaid', label: 'Mermaid Diagram', icon: GitBranch, defaultContent: 'graph TD\n    A[Start] --> B[End]' },
  { extension: '.kanban', label: 'Kanban Board', icon: Kanban, defaultContent: '{"columns":[],"tasks":{}}' },
  { extension: '.sheet', label: 'Spreadsheet', icon: Table, defaultContent: '[]' },
  { extension: '.csv', label: 'CSV', icon: FileSpreadsheet, defaultContent: 'Column 1,Column 2,Column 3\n' },
  { extension: '.html', label: 'HTML', icon: Globe, defaultContent: '<!DOCTYPE html>\n<html>\n<head>\n  <title>New Page</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>' },
  { extension: '.js', label: 'JavaScript', icon: Code, defaultContent: '// JavaScript file\n' },
  { extension: '.ts', label: 'TypeScript', icon: Code, defaultContent: '// TypeScript file\n' },
  { extension: '.json', label: 'JSON', icon: Code, defaultContent: '{\n  \n}' },
];

// Sort options
type SortOption = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'type';

interface FileNodeProps {
  entry: FileEntry;
  depth?: number;
  onMoveFile: (sourcePath: string, targetFolder: string) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
  onExternalFileDrop: (files: File[], targetFolder: string) => void;
  selectedPaths: Set<string>;
  onSelect: (path: string, entry: FileEntry, e: React.MouseEvent) => void;
  lastSelectedPath: string | null;
  allEntries: FileEntry[];
  focusedPath: string | null;
  onSetFocused: (path: string | null) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  searchQuery: string;
}

// Flatten entries for shift-select range
const flattenEntries = (entries: FileEntry[], expanded: Set<string>): FileEntry[] => {
  const result: FileEntry[] = [];
  const traverse = (items: FileEntry[]) => {
    for (const item of items) {
      result.push(item);
      if (item.isDirectory && item.children && expanded.has(item.path)) {
        traverse(item.children);
      }
    }
  };
  traverse(entries);
  return result;
};

const FileNode: React.FC<FileNodeProps> = ({ 
  entry, 
  depth = 0, 
  onMoveFile, 
  onContextMenu, 
  onExternalFileDrop,
  selectedPaths,
  onSelect,
  lastSelectedPath,
  allEntries,
  focusedPath,
  onSetFocused,
  expandedFolders,
  onToggleFolder,
  searchQuery,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const { openFile, activeFile, currentPath } = useAppStore();
  const isSelected = selectedPaths.has(entry.path);
  const isFocused = focusedPath === entry.path;
  const isOpen = expandedFolders.has(entry.path);

  // Filter by search query
  const matchesSearch = !searchQuery || entry.name.toLowerCase().includes(searchQuery.toLowerCase());
  const hasMatchingChildren = entry.isDirectory && entry.children?.some(child => 
    child.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (child.isDirectory && child.children?.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  if (searchQuery && !matchesSearch && !hasMatchingChildren) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(entry.path, entry, e);
    onSetFocused(entry.path);
    
    if (entry.isDirectory) {
      // Double-click to toggle folder
      if (e.detail === 2) {
        onToggleFolder(entry.path);
      }
    } else if (e.detail === 2) {
      // Double-click opens file
      openFile(entry.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // If right-clicking on unselected item, select it
    if (!selectedPaths.has(entry.path)) {
      onSelect(entry.path, entry, e);
    }
    onContextMenu(e, entry);
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    // Set data for internal moves
    const paths = selectedPaths.size > 0 && selectedPaths.has(entry.path)
      ? Array.from(selectedPaths)
      : [entry.path];
    
    e.dataTransfer.setData('text/plain', JSON.stringify(paths));
    e.dataTransfer.effectAllowed = 'copyMove';
    
    // For native drag to external apps - set file:// URL
    // This enables dragging to Chrome, other file explorers, etc.
    if (paths.length === 1) {
      const filePath = paths[0];
      // Windows file URI format
      const fileUrl = `file:///${filePath.replace(/\\/g, '/').replace(/^\//, '')}`;
      e.dataTransfer.setData('text/uri-list', fileUrl);
      
      // Also set the DownloadURL for Chrome compatibility
      const fileName = filePath.split(/[\\/]/).pop() || 'file';
      const mimeType = getMimeType(fileName);
      e.dataTransfer.setData('DownloadURL', `${mimeType}:${fileName}:${fileUrl}`);
    }

    // Set drag image
    if (selectedPaths.size > 1 && selectedPaths.has(entry.path)) {
      const dragBadge = document.createElement('div');
      dragBadge.textContent = `${selectedPaths.size} items`;
      dragBadge.style.cssText = 'padding: 4px 8px; background: #7c3aed; color: white; border-radius: 4px; font-size: 12px;';
      document.body.appendChild(dragBadge);
      e.dataTransfer.setDragImage(dragBadge, 0, 0);
      setTimeout(() => dragBadge.remove(), 0);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (entry.isDirectory) {
      e.preventDefault();
      if (e.dataTransfer.types.includes('Files')) {
        e.dataTransfer.dropEffect = 'copy';
      } else {
        e.dataTransfer.dropEffect = 'move';
      }
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (entry.isDirectory) {
      // Check for external files first
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onExternalFileDrop(Array.from(e.dataTransfer.files), entry.path);
        return;
      }
      
      // Internal file move (may be multiple files)
      const data = e.dataTransfer.getData('text/plain');
      if (data) {
        try {
          const paths = JSON.parse(data) as string[];
          for (const sourcePath of paths) {
            if (sourcePath !== entry.path && !entry.path.startsWith(sourcePath + '/')) {
              onMoveFile(sourcePath, entry.path);
            }
          }
        } catch {
          // Fallback for single path string
          if (data !== entry.path) {
            onMoveFile(data, entry.path);
          }
        }
      }
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFolder(entry.path);
  };

  return (
    <div>
      <div 
        className={clsx(
          "flex items-center py-1 px-2 cursor-pointer select-none transition-colors",
          isSelected && "bg-[#094771]",
          !isSelected && "hover:bg-gray-200 dark:hover:bg-gray-800",
          isFocused && "ring-1 ring-inset ring-blue-400",
          isDragOver && entry.isDirectory && "bg-blue-200 dark:bg-blue-800 ring-2 ring-blue-500"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {entry.isDirectory ? (
          <span className="mr-1 text-gray-500 cursor-pointer w-4 flex-shrink-0 flex items-center justify-center" onClick={handleToggle}>
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        ) : (
          <span className="mr-1 text-gray-500 w-4 flex-shrink-0" />
        )}
        <span className="mr-1.5 text-gray-500 flex-shrink-0">
          {entry.isDirectory ? (
            isOpen ? <FolderOpen size={16} className="text-yellow-500" /> : <FolderClosed size={16} className="text-yellow-500" />
          ) : (
            <File size={16} />
          )}
        </span>
        <span className={clsx(
          "truncate text-sm",
          searchQuery && matchesSearch && "bg-yellow-500/30"
        )}>{entry.name}</span>
      </div>
      {isOpen && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileNode 
              key={child.path} 
              entry={child} 
              depth={depth + 1} 
              onMoveFile={onMoveFile} 
              onContextMenu={onContextMenu} 
              onExternalFileDrop={onExternalFileDrop}
              selectedPaths={selectedPaths}
              onSelect={onSelect}
              lastSelectedPath={lastSelectedPath}
              allEntries={allEntries}
              focusedPath={focusedPath}
              onSetFocused={onSetFocused}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Get MIME type for drag operations
const getMimeType = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'md': 'text/markdown',
    'txt': 'text/plain',
    'json': 'application/json',
    'js': 'text/javascript',
    'ts': 'text/typescript',
    'html': 'text/html',
    'css': 'text/css',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
};

// Image file extensions for link update detection
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff', 'tif']);

const isImageFile = (path: string): boolean => {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.has(ext);
};

export const FileExplorer: React.FC = () => {
  const { fileStructure, currentPath, setFileStructure, closeFile } = useAppStore();
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const quickCreateRef = useRef<HTMLDivElement>(null);
  const explorerRef = useRef<HTMLDivElement>(null);
  
  // Multi-select state
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null);
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  
  // Expanded folders state (controlled from parent for shift-select)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // Search filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  // Sort state
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  
  // Cut mode for cut/paste (different from copy)
  const [cutPaths, setCutPaths] = useState<Set<string>>(new Set());
  
  // Clipboard state for copy/paste
  const [clipboard, setClipboard] = useState<FileEntry | null>(null);
  
  // Context menu state (entry may be null when clicking empty space)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry?: FileEntry | null } | null>(null);
  const [renameModal, setRenameModal] = useState<{ isOpen: boolean; entry: FileEntry | null; newName: string }>({
    isOpen: false,
    entry: null,
    newName: ''
  });
  
  // Update links modal state (for when images are moved)
  const [updateLinksModal, setUpdateLinksModal] = useState<{
    isOpen: boolean;
    movedImages: Array<{ oldPath: string; newPath: string }>;
    isProcessing: boolean;
  } | null>(null);
  
  // Ref to batch multiple image moves before showing modal
  const pendingImageMovesRef = useRef<Array<{ oldPath: string; newPath: string }>>([]);
  const imageMoveBatchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Toggle folder expansion
  const handleToggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);
  
  // Handle file/folder selection with multi-select support
  const handleSelect = useCallback((path: string, entry: FileEntry, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Toggle selection
      setSelectedPaths(prev => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        return next;
      });
      setLastSelectedPath(path);
    } else if (e.shiftKey && lastSelectedPath) {
      // Range selection
      const flatList = flattenEntries(fileStructure, expandedFolders);
      const lastIndex = flatList.findIndex(e => e.path === lastSelectedPath);
      const currentIndex = flatList.findIndex(e => e.path === path);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangePaths = flatList.slice(start, end + 1).map(e => e.path);
        setSelectedPaths(new Set(rangePaths));
      }
    } else {
      // Single selection (also on single click for folders)
      setSelectedPaths(new Set([path]));
      setLastSelectedPath(path);
    }
  }, [lastSelectedPath, fileStructure, expandedFolders]);
  
  // Clear selection when clicking empty space
  const handleExplorerClick = useCallback((e: React.MouseEvent) => {
    // Only clear if clicking directly on the explorer background
    if (e.target === e.currentTarget) {
      setSelectedPaths(new Set());
      setLastSelectedPath(null);
      setFocusedPath(null);
    }
  }, []);
  
  // Sort file structure
  const sortedFileStructure = useMemo(() => {
    const sortEntries = (entries: FileEntry[]): FileEntry[] => {
      const sorted = [...entries].sort((a, b) => {
        // Folders always come first
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        
        switch (sortOption) {
          case 'name-asc':
            return a.name.localeCompare(b.name);
          case 'name-desc':
            return b.name.localeCompare(a.name);
          case 'type':
            const extA = a.name.includes('.') ? a.name.split('.').pop() || '' : '';
            const extB = b.name.includes('.') ? b.name.split('.').pop() || '' : '';
            return extA.localeCompare(extB) || a.name.localeCompare(b.name);
          default:
            return a.name.localeCompare(b.name);
        }
      });
      return sorted.map(entry => ({
        ...entry,
        children: entry.children ? sortEntries(entry.children) : undefined
      }));
    };
    return sortEntries(fileStructure);
  }, [fileStructure, sortOption]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Listen for app-refresh-files event
  useEffect(() => {
    const handleRefresh = () => refreshFileStructure();
    window.addEventListener('app-refresh-files', handleRefresh);
    return () => window.removeEventListener('app-refresh-files', handleRefresh);
  }, [currentPath]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickCreateRef.current && !quickCreateRef.current.contains(e.target as Node)) {
        setIsQuickCreateOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileContextMenu = (e: React.MouseEvent, entry: FileEntry) => {
    setContextMenu({ x: e.clientX, y: e.clientY, entry });
  };

  // Right-click on empty explorer area
  const handleExplorerContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, entry: null });
  };

  const { renameFilePath } = useAppStore();

  const handleRename = async () => {
    if (!renameModal.entry || !renameModal.newName.trim()) return;
    
    const oldPath = renameModal.entry.path;
    const parentDir = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = `${parentDir}/${renameModal.newName}`;
    const isDirectory = renameModal.entry.isDirectory;
    
    // Collect all open file paths that will be affected by this rename
    const { openFiles } = useAppStore.getState();
    const affectedFiles: { oldPath: string; newPath: string }[] = [];
    for (const filePath of openFiles) {
      if (filePath === oldPath) {
        affectedFiles.push({ oldPath: filePath, newPath });
      } else if (isDirectory && filePath.startsWith(oldPath + '/')) {
        affectedFiles.push({ oldPath: filePath, newPath: newPath + filePath.substring(oldPath.length) });
      }
    }
    
    try {
      await window.electronAPI.moveFile(oldPath, newPath);
      // Update store paths (openFiles, activeFile, fileContents, etc.)
      renameFilePath(oldPath, newPath);
      // Notify App.tsx to update FlexLayout tabs — pass all affected tab paths
      window.dispatchEvent(new CustomEvent('app-rename-file', { detail: { oldPath, newPath, affectedFiles } }));
      await refreshFileStructure();
      setRenameModal({ isOpen: false, entry: null, newName: '' });
    } catch (e) {
      console.error("Failed to rename", e);
      alert("Failed to rename: " + (e as Error).message);
    }
  };

  const handleDelete = async (entry: FileEntry) => {
    const confirmMsg = entry.isDirectory 
      ? `Delete folder "${entry.name}" and all its contents?`
      : `Delete "${entry.name}"?`;
    
    if (!confirm(confirmMsg)) return;
    
    try {
      await window.electronAPI.deleteFile(entry.path);
      closeFile(entry.path);
      window.dispatchEvent(new CustomEvent('app-close-file', { detail: { path: entry.path } }));
      await refreshFileStructure();
    } catch (e) {
      console.error("Failed to delete", e);
      alert("Failed to delete: " + (e as Error).message);
    }
  };

  const handleDuplicate = async (entry: FileEntry) => {
    if (entry.isDirectory) return; // Don't duplicate folders for now
    
    const ext = entry.name.includes('.') ? '.' + entry.name.split('.').pop() : '';
    const baseName = entry.name.replace(ext, '');
    let newName = `${baseName} copy${ext}`;
    let counter = 2;
    
    const parentDir = entry.path.substring(0, entry.path.lastIndexOf('/'));
    while (await window.electronAPI.exists(`${parentDir}/${newName}`)) {
      newName = `${baseName} copy ${counter}${ext}`;
      counter++;
    }
    
    try {
      await window.electronAPI.copyFile(entry.path, `${parentDir}/${newName}`);
      await refreshFileStructure();
    } catch (e) {
      console.error("Failed to duplicate", e);
      alert("Failed to duplicate: " + (e as Error).message);
    }
  };

  // Copy to clipboard
  const handleCopy = (entry: FileEntry) => {
    setClipboard(entry);
  };

  // Paste from clipboard
  const handlePaste = async () => {
    if (!clipboard || !currentPath) return;
    
    const entry = clipboard;
    const ext = entry.name.includes('.') ? '.' + entry.name.split('.').pop() : '';
    const baseName = entry.name.replace(ext, '');
    
    // Determine target directory (same as source)
    const parentDir = entry.path.substring(0, entry.path.lastIndexOf('/'));
    
    // Generate unique name
    let newName = `${baseName} copy${ext}`;
    let counter = 2;
    while (await window.electronAPI.exists(`${parentDir}/${newName}`)) {
      newName = `${baseName} copy ${counter}${ext}`;
      counter++;
    }
    
    const destPath = `${parentDir}/${newName}`;
    
    try {
      if (entry.isDirectory) {
        // For directories, recursively copy
        await copyDirectoryRecursive(entry.path, destPath);
      } else {
        await window.electronAPI.copyFile(entry.path, destPath);
      }
      await refreshFileStructure();
    } catch (e) {
      console.error("Failed to paste", e);
      alert("Failed to paste: " + (e as Error).message);
    }
  };

  // Helper to copy directory recursively
  const copyDirectoryRecursive = async (srcDir: string, destDir: string) => {
    await window.electronAPI.mkdir(destDir);
    const entries = await window.electronAPI.readDir(srcDir);
    
    for (const entry of entries) {
      const srcPath = `${srcDir}/${entry.name}`;
      const destPath = `${destDir}/${entry.name}`;
      
      if (entry.isDirectory) {
        await copyDirectoryRecursive(srcPath, destPath);
      } else {
        await window.electronAPI.copyFile(srcPath, destPath);
      }
    }
  };

  // Keyboard shortcuts for copy/paste/delete and navigation
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Only handle if file explorer is focused
      if (!explorerRef.current?.contains(document.activeElement) && 
          !explorerRef.current?.matches(':focus-within')) {
        return;
      }
      
      // Delete key - delete selected files
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPaths.size > 0) {
        e.preventDefault();
        const pathsToDelete = Array.from(selectedPaths);
        const count = pathsToDelete.length;
        const confirmMsg = count === 1 
          ? `Delete "${pathsToDelete[0].split(/[\\/]/).pop()}"?`
          : `Delete ${count} items?`;
        
        if (!confirm(confirmMsg)) return;
        
        for (const path of pathsToDelete) {
          try {
            await window.electronAPI.deleteFile(path);
            closeFile(path);
            window.dispatchEvent(new CustomEvent('app-close-file', { detail: { path } }));
          } catch (err) {
            console.error('Failed to delete:', path, err);
          }
        }
        setSelectedPaths(new Set());
        await refreshFileStructure();
        return;
      }
      
      // Ctrl+X - Cut
      if ((e.ctrlKey || e.metaKey) && e.key === 'x' && selectedPaths.size > 0) {
        e.preventDefault();
        setCutPaths(new Set(selectedPaths));
        setClipboard(null); // Clear copy clipboard
        return;
      }
      
      // Ctrl+C - Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        if (selectedPaths.size > 0) {
          // Store first selected for single-file operations
          const firstPath = Array.from(selectedPaths)[0];
          const entry = findEntryByPath(fileStructure, firstPath);
          if (entry) {
            setClipboard(entry);
            setCutPaths(new Set()); // Clear cut mode
          }
        } else if (contextMenu?.entry) {
          handleCopy(contextMenu.entry);
          setCutPaths(new Set());
        }
        setContextMenu(null);
        return;
      }
      
      // Ctrl+V - Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        
        // Handle cut-paste (move)
        if (cutPaths.size > 0 && currentPath) {
          // Determine target folder
          let targetFolder = currentPath;
          if (selectedPaths.size === 1) {
            const selectedPath = Array.from(selectedPaths)[0];
            const selectedEntry = findEntryByPath(fileStructure, selectedPath);
            if (selectedEntry?.isDirectory) {
              targetFolder = selectedPath;
            }
          }
          
          for (const srcPath of cutPaths) {
            try {
              const fileName = srcPath.split(/[\\/]/).pop();
              if (fileName) {
                const destPath = `${targetFolder}/${fileName}`;
                if (srcPath !== destPath) {
                  await window.electronAPI.moveFile(srcPath, destPath);
                  closeFile(srcPath);
                }
              }
            } catch (err) {
              console.error('Failed to move:', srcPath, err);
            }
          }
          setCutPaths(new Set());
          await refreshFileStructure();
          return;
        }
        
        // Handle copy-paste
        if (clipboard) {
          await handlePaste();
        }
        return;
      }
      
      // Ctrl+A - Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const allPaths = flattenEntries(fileStructure, expandedFolders).map(e => e.path);
        setSelectedPaths(new Set(allPaths));
        return;
      }
      
      // Ctrl+F - Toggle search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(prev => !prev);
        return;
      }
      
      // Escape - Clear selection / close search
      if (e.key === 'Escape') {
        if (showSearch) {
          setShowSearch(false);
          setSearchQuery('');
        } else {
          setSelectedPaths(new Set());
          setFocusedPath(null);
        }
        return;
      }
      
      // Arrow key navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const flatList = flattenEntries(sortedFileStructure, expandedFolders);
        if (flatList.length === 0) return;
        
        const currentIndex = focusedPath ? flatList.findIndex(entry => entry.path === focusedPath) : -1;
        
        if (e.key === 'ArrowDown') {
          const nextIndex = currentIndex < flatList.length - 1 ? currentIndex + 1 : 0;
          const nextEntry = flatList[nextIndex];
          setFocusedPath(nextEntry.path);
          if (!e.shiftKey) {
            setSelectedPaths(new Set([nextEntry.path]));
            setLastSelectedPath(nextEntry.path);
          } else {
            // Extend selection
            setSelectedPaths(prev => new Set([...prev, nextEntry.path]));
          }
        } else if (e.key === 'ArrowUp') {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : flatList.length - 1;
          const prevEntry = flatList[prevIndex];
          setFocusedPath(prevEntry.path);
          if (!e.shiftKey) {
            setSelectedPaths(new Set([prevEntry.path]));
            setLastSelectedPath(prevEntry.path);
          } else {
            setSelectedPaths(prev => new Set([...prev, prevEntry.path]));
          }
        } else if (e.key === 'ArrowRight' && focusedPath) {
          // Expand folder or move to first child
          const entry = findEntryByPath(fileStructure, focusedPath);
          if (entry?.isDirectory) {
            if (!expandedFolders.has(focusedPath)) {
              handleToggleFolder(focusedPath);
            } else if (entry.children && entry.children.length > 0) {
              // Move to first child
              const firstChild = entry.children[0];
              setFocusedPath(firstChild.path);
              setSelectedPaths(new Set([firstChild.path]));
              setLastSelectedPath(firstChild.path);
            }
          }
        } else if (e.key === 'ArrowLeft' && focusedPath) {
          // Collapse folder or move to parent
          const entry = findEntryByPath(fileStructure, focusedPath);
          if (entry?.isDirectory && expandedFolders.has(focusedPath)) {
            handleToggleFolder(focusedPath);
          } else {
            // Move to parent
            const parentPath = focusedPath.substring(0, focusedPath.lastIndexOf('/'));
            if (parentPath && parentPath !== currentPath) {
              const parentEntry = findEntryByPath(fileStructure, parentPath);
              if (parentEntry) {
                setFocusedPath(parentPath);
                setSelectedPaths(new Set([parentPath]));
                setLastSelectedPath(parentPath);
              }
            }
          }
        }
        return;
      }
      
      // Enter - Open file or toggle folder
      if (e.key === 'Enter' && focusedPath) {
        const entry = findEntryByPath(fileStructure, focusedPath);
        if (entry) {
          if (entry.isDirectory) {
            handleToggleFolder(focusedPath);
          } else {
            useAppStore.getState().openFile(focusedPath);
          }
        }
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contextMenu, clipboard, currentPath, selectedPaths, cutPaths, fileStructure, expandedFolders, focusedPath, showSearch, sortedFileStructure, handleToggleFolder, closeFile]);

  // Helper to find entry by path
  const findEntryByPath = (entries: FileEntry[], path: string): FileEntry | null => {
    for (const entry of entries) {
      if (entry.path === path) return entry;
      if (entry.children) {
        const found = findEntryByPath(entry.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const handleOpenToRight = (entry: FileEntry) => {
    if (!entry.isDirectory) {
      // Dispatch event to open file in a new tab to the right
      window.dispatchEvent(new CustomEvent('app-open-to-right', { detail: { path: entry.path } }));
    }
  };

  const handleShowInExplorer = async (entry: FileEntry) => {
    await window.electronAPI.showInExplorer(entry.path);
  };

  const handleExternalFileDrop = async (files: File[], targetFolder: string) => {
    for (const file of files) {
      try {
        const filePath = (file as any).path;
        if (filePath) {
          const fileName = filePath.split(/[\\/]/).pop() || file.name;
          let destPath = `${targetFolder}/${fileName}`;
          
          // Check if file already exists, append number if so
          let counter = 1;
          const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';
          const baseName = fileName.replace(ext, '');
          while (await window.electronAPI.exists(destPath)) {
            destPath = `${targetFolder}/${baseName} (${counter})${ext}`;
            counter++;
          }
          
          await window.electronAPI.copyFile(filePath, destPath);
        }
      } catch (err) {
        console.error('Failed to import file:', err);
      }
    }
    await refreshFileStructure();
  };

  const handleMoveTo = async (entry: FileEntry) => {
    // Open folder picker dialog
    const targetFolder = await window.electronAPI.openFolder();
    if (targetFolder) {
      try {
        const fileName = entry.name;
        const destPath = `${targetFolder}/${fileName}`;
        await window.electronAPI.moveFile(entry.path, destPath);
        closeFile(entry.path);
        await refreshFileStructure();
      } catch (e) {
        console.error("Failed to move", e);
        alert("Failed to move: " + (e as Error).message);
      }
    }
  };

  const refreshFileStructure = async () => {
    if (currentPath) {
      const files = await loadFileStructure(currentPath);
      setFileStructure(files);
    }
  };

  // Generate unique "Untitled" filename
  const generateUntitledName = async (extension: string): Promise<string> => {
    if (!currentPath) return `Untitled${extension}`;
    
    let name = `Untitled${extension}`;
    let counter = 1;
    
    while (await window.electronAPI.exists(`${currentPath}/${name}`)) {
      name = `Untitled ${counter}${extension}`;
      counter++;
    }
    
    return name;
  };

  const handleMoveFile = async (sourcePath: string, targetFolder: string) => {
    try {
      const fileName = sourcePath.split('/').pop();
      if (!fileName) return;
      
      const destPath = `${targetFolder}/${fileName}`;
      
      // Don't move if destination is the same as source parent
      const sourceParent = sourcePath.substring(0, sourcePath.lastIndexOf('/'));
      if (sourceParent === targetFolder) return;
      
      await window.electronAPI.moveFile(sourcePath, destPath);
      
      // If it's an image file, queue it for link update prompt
      if (isImageFile(sourcePath)) {
        pendingImageMovesRef.current.push({ oldPath: sourcePath, newPath: destPath });
        
        // Clear existing timeout and set a new one to batch multiple moves
        if (imageMoveBatchTimeoutRef.current) {
          clearTimeout(imageMoveBatchTimeoutRef.current);
        }
        imageMoveBatchTimeoutRef.current = setTimeout(() => {
          if (pendingImageMovesRef.current.length > 0) {
            setUpdateLinksModal({
              isOpen: true,
              movedImages: [...pendingImageMovesRef.current],
              isProcessing: false
            });
            pendingImageMovesRef.current = [];
          }
        }, 100); // Small delay to batch multiple moves
      }
      
      await refreshFileStructure();
    } catch (e) {
      console.error("Failed to move file", e);
      alert("Failed to move file: " + (e as Error).message);
    }
  };

  // Update image links in all markdown files
  const handleUpdateImageLinks = async (movedImages: Array<{ oldPath: string; newPath: string }>) => {
    if (!currentPath || movedImages.length === 0) return;
    
    setUpdateLinksModal(prev => prev ? { ...prev, isProcessing: true } : null);
    
    try {
      // Helper to collect all markdown files
      const collectMarkdownFiles = (entries: FileEntry[]): string[] => {
        const mdFiles: string[] = [];
        for (const entry of entries) {
          if (entry.isDirectory && entry.children) {
            mdFiles.push(...collectMarkdownFiles(entry.children));
          } else if (entry.name.toLowerCase().endsWith('.md')) {
            mdFiles.push(entry.path);
          }
        }
        return mdFiles;
      };
      
      const markdownFiles = collectMarkdownFiles(fileStructure);
      const normalizePathForSearch = (p: string) => p.replace(/\\/g, '/');
      const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      let updatedCount = 0;
      
      for (const mdFile of markdownFiles) {
        try {
          let content = await readFileContent(mdFile);
          let newContent = content;
          
          // Process each moved image
          for (const { oldPath, newPath } of movedImages) {
            const oldNormalized = normalizePathForSearch(oldPath);
            const newNormalized = normalizePathForSearch(newPath);
            
            const oldFileName = oldPath.split('/').pop() || '';
            const newFileName = newPath.split('/').pop() || '';
            
            const oldRelative = oldNormalized.startsWith(normalizePathForSearch(currentPath)) 
              ? oldNormalized.substring(normalizePathForSearch(currentPath).length + 1)
              : oldNormalized;
            const newRelative = newNormalized.startsWith(normalizePathForSearch(currentPath))
              ? newNormalized.substring(normalizePathForSearch(currentPath).length + 1)
              : newNormalized;
            
            // Pattern 1: Standard markdown image syntax ![alt](path)
            const mdImagePattern = new RegExp(
              `(!\\[[^\\]]*\\]\\()` +
              `(${escapeRegex(oldNormalized)}|${escapeRegex(oldRelative)}|${escapeRegex(oldFileName)})` +
              `(\\))`,
              'g'
            );
            newContent = newContent.replace(mdImagePattern, (match, prefix, path, suffix) => {
              if (path === oldNormalized) return `${prefix}${newNormalized}${suffix}`;
              if (path === oldRelative) return `${prefix}${newRelative}${suffix}`;
              if (path === oldFileName) return `${prefix}${newFileName}${suffix}`;
              return match;
            });
            
            // Pattern 2: Wiki-style embed ![[filename]] or ![[path/to/filename]]
            const wikiPattern = new RegExp(
              `(!\\[\\[)` +
              `(${escapeRegex(oldRelative)}|${escapeRegex(oldFileName)})` +
              `(\\]\\])`,
              'g'
            );
            newContent = newContent.replace(wikiPattern, (match, prefix, path, suffix) => {
              if (path === oldRelative) return `${prefix}${newRelative}${suffix}`;
              if (path === oldFileName) return `${prefix}${newFileName}${suffix}`;
              return match;
            });
          }
          
          // If content changed, save the file
          if (newContent !== content) {
            await saveFileContent(mdFile, newContent);
            updatedCount++;
            
            // Also update the in-memory content if file is open
            const { fileContents, setFileContent } = useAppStore.getState();
            if (fileContents[mdFile]) {
              setFileContent(mdFile, newContent);
            }
          }
        } catch (e) {
          console.warn(`Failed to update links in ${mdFile}:`, e);
        }
      }
      
      setUpdateLinksModal(null);
      
      if (updatedCount > 0) {
        // Trigger refresh of any open editors
        window.dispatchEvent(new CustomEvent('app-refresh-files'));
      }
    } catch (e) {
      console.error("Failed to update image links:", e);
      setUpdateLinksModal(null);
    }
  };

  const handleQuickCreate = async (fileType: typeof FILE_TYPES[0]) => {
    if (!currentPath) return;
    setIsQuickCreateOpen(false);
    
    try {
      const fileName = await generateUntitledName(fileType.extension);
      const fullPath = `${currentPath}/${fileName}`;
      await createFile(fullPath, fileType.defaultContent);
      const files = await loadFileStructure(currentPath);
      setFileStructure(files);
      
      // Open the newly created file
      useAppStore.getState().openFile(fullPath);
    } catch (e) {
      console.error("Failed to create file", e);
      alert("Failed to create file");
    }
  };

  const handleCreateFolder = async () => {
    if (!currentPath) return;
    try {
      // Generate unique folder name
      let folderName = 'Untitled Folder';
      let counter = 1;
      while (await window.electronAPI.exists(`${currentPath}/${folderName}`)) {
        folderName = `Untitled Folder ${counter}`;
        counter++;
      }
      
      const fullPath = `${currentPath}/${folderName}`;
      await createFolder(fullPath);
      const files = await loadFileStructure(currentPath);
      setFileStructure(files);
    } catch (e) {
      console.error("Failed to create folder", e);
      alert("Failed to create folder");
    }
  };

  const [isRootDragOver, setIsRootDragOver] = useState(false);

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Check if it's a file from external source or internal move
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'move';
    }
    setIsRootDragOver(true);
  };

  const handleRootDragLeave = () => {
    setIsRootDragOver(false);
  };

  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsRootDragOver(false);
    
    if (!currentPath) return;
    
    // Check for external files first (from system file explorer)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[];
      for (const file of files) {
        try {
          // Get the file path - in Electron, dropped files have a path property
          const filePath = (file as any).path as string;
          if (filePath) {
            const fileName = filePath.split(/[\\/]/).pop() || file.name;
            let destPath = `${currentPath}/${fileName}`;
            
            // Check if file already exists, append number if so
            let counter = 1;
            const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';
            const baseName = fileName.replace(ext, '');
            while (await window.electronAPI.exists(destPath)) {
              destPath = `${currentPath}/${baseName} (${counter})${ext}`;
              counter++;
            }
            
            await window.electronAPI.copyFile(filePath, destPath);
          }
        } catch (err) {
          console.error('Failed to import file:', err);
        }
      }
      await refreshFileStructure();
      return;
    }
    
    // Internal file move
    const sourcePath = e.dataTransfer.getData('text/plain');
    if (sourcePath) {
      await handleMoveFile(sourcePath, currentPath);
    }
  };

  return (
    <div 
      ref={explorerRef}
      className="w-full h-full bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col"
      tabIndex={0}
      onContextMenu={handleExplorerContextMenu}
      onClick={handleExplorerClick}
    >
      <div className="p-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 overflow-hidden">
        <span className="font-semibold text-sm uppercase text-gray-500 whitespace-nowrap overflow-hidden transition-all duration-200 ease-out min-w-0" style={{ flexShrink: 1 }}>Explorer</span>
        <div className="flex space-x-1 flex-shrink-0 ml-auto">
          {/* Search Toggle */}
          <button
            className={clsx(
              "p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded",
              showSearch && "bg-gray-200 dark:bg-gray-800"
            )}
            title="Search (Ctrl+F)"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search size={16} />
          </button>
          {/* Sort Options */}
          <div className="relative group">
            <button
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
              title="Sort"
            >
              <ArrowUpDown size={16} />
            </button>
            <div className="absolute right-0 top-full mt-1 bg-[#2d2d2d] border border-[#404040] rounded-lg shadow-lg z-50 min-w-[150px] py-1 text-[#dcddde] hidden group-hover:block">
              {[
                { value: 'name-asc', label: 'Name (A-Z)' },
                { value: 'name-desc', label: 'Name (Z-A)' },
                { value: 'type', label: 'Type' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={clsx(
                    "w-full px-3 py-1.5 text-left text-sm hover:bg-[#094771] transition-colors",
                    sortOption === opt.value && "bg-[#094771]"
                  )}
                  onClick={() => setSortOption(opt.value as SortOption)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {/* Quick Create Dropdown */}
          <div className="relative" ref={quickCreateRef}>
            <button 
              className={clsx(
                "p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded flex items-center gap-0.5",
                isQuickCreateOpen && "bg-gray-200 dark:bg-gray-800"
              )}
              title="Quick Create"
              onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
            >
              <Plus size={16} />
              {isQuickCreateOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {isQuickCreateOpen && (
              <div className="absolute left-0 top-full mt-1 bg-[#2d2d2d] border border-[#404040] rounded-lg shadow-lg z-50 min-w-[180px] py-1 text-[#dcddde]">
                {FILE_TYPES.map((fileType) => {
                  const Icon = fileType.icon;
                  return (
                    <button
                      key={fileType.extension}
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-[#094771] flex items-center gap-2 transition-colors"
                      onClick={() => handleQuickCreate(fileType)}
                    >
                      <Icon size={14} className="text-[#888]" />
                      <span>{fileType.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button 
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded" 
            title="New File"
            onClick={() => handleQuickCreate(FILE_TYPES[0])}
          >
            <FilePlus size={16} />
          </button>
          <button 
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded" 
            title="New Folder"
            onClick={handleCreateFolder}
          >
            <FolderPlus size={16} />
          </button>
        </div>
      </div>
      
      {/* Search Bar */}
      {showSearch && (
        <div className="p-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
          <Search size={14} className="text-gray-500" />
          <input
            type="text"
            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-500"
            placeholder="Filter files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
      
      {/* Selection info bar */}
      {selectedPaths.size > 1 && (
        <div className="px-2 py-1 bg-[#094771] text-sm text-white flex items-center justify-between">
          <span>{selectedPaths.size} items selected</span>
          <button
            className="hover:underline text-xs"
            onClick={() => setSelectedPaths(new Set())}
          >
            Clear
          </button>
        </div>
      )}
      
      {/* Cut mode indicator */}
      {cutPaths.size > 0 && (
        <div className="px-2 py-1 bg-orange-600 text-sm text-white flex items-center justify-between">
          <span><Scissors size={12} className="inline mr-1" />{cutPaths.size} item(s) cut</span>
          <button
            className="hover:underline text-xs"
            onClick={() => setCutPaths(new Set())}
          >
            Cancel
          </button>
        </div>
      )}
      
      <div 
        className={clsx(
          "flex-grow overflow-y-auto",
          isRootDragOver && "bg-blue-100 dark:bg-blue-900/30"
        )}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        {currentPath ? (
          sortedFileStructure.map((entry) => (
            <FileNode 
              key={entry.path} 
              entry={entry} 
              onMoveFile={handleMoveFile} 
              onContextMenu={handleFileContextMenu} 
              onExternalFileDrop={handleExternalFileDrop}
              selectedPaths={selectedPaths}
              onSelect={handleSelect}
              lastSelectedPath={lastSelectedPath}
              allEntries={sortedFileStructure}
              focusedPath={focusedPath}
              onSetFocused={setFocusedPath}
              expandedFolders={expandedFolders}
              onToggleFolder={handleToggleFolder}
              searchQuery={searchQuery}
            />
          ))
        ) : (
          <div className="p-4 text-center text-gray-500 text-sm">
            No folder opened
          </div>
        )}
      </div>

      {/* Context Menu - rendered with high z-index to appear above FlexLayout splitters */}
      {contextMenu && (
        <div
          className="fixed z-[9999] bg-[#2d2d2d] border border-[#404040] rounded-lg shadow-xl py-1 min-w-[200px] text-[#dcddde]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-[#094771] flex items-center gap-2 transition-colors"
            onClick={async () => {
              await refreshFileStructure();
              setContextMenu(null);
            }}
          >
            <PanelRight size={14} className="text-[#888]" />
            <span>Refresh</span>
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-[#094771] flex items-center gap-2 transition-colors"
            onClick={() => {
              setExpandedFolders(new Set());
              setContextMenu(null);
            }}
          >
            <ChevronsUpDown size={14} className="text-[#888]" />
            <span>Collapse All</span>
          </button>
          <div className="border-t border-[#404040] my-1" />

          {contextMenu.entry && !contextMenu.entry.isDirectory && (
            <button
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-[#094771] flex items-center gap-2 transition-colors"
              onClick={() => {
                handleOpenToRight(contextMenu.entry!);
                setContextMenu(null);
              }}
            >
              <PanelRight size={14} className="text-[#888]" />
              <span>Open to the right</span>
            </button>
          )}

          {contextMenu.entry && !contextMenu.entry.isDirectory && (
            <button
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-[#094771] flex items-center gap-2 transition-colors"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('app-open-version-history', { detail: { path: contextMenu.entry!.path } }));
                setContextMenu(null);
              }}
            >
              <History size={14} className="text-[#888]" />
              <span>Version history</span>
            </button>
          )}

          <div className="border-t border-[#404040] my-1" />

          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-[#094771] flex items-center gap-2 transition-colors"
            onClick={() => {
              if (contextMenu.entry) handleCopy(contextMenu.entry);
              setContextMenu(null);
            }}
          >
            <Copy size={14} className="text-[#888]" />
            <span>Copy</span>
            <span className="ml-auto text-xs text-[#666]">⌘C</span>
          </button>
          <button
            className={clsx(
              "w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 transition-colors",
              clipboard ? "hover:bg-[#094771]" : "opacity-50 cursor-not-allowed"
            )}
            onClick={() => {
              if (clipboard) {
                handlePaste();
                setContextMenu(null);
              }
            }}
            disabled={!clipboard}
          >
            <Clipboard size={14} className="text-[#888]" />
            <span>Paste</span>
            <span className="ml-auto text-xs text-[#666]">⌘V</span>
          </button>

          {contextMenu.entry && !contextMenu.entry.isDirectory && (
            <button
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-[#094771] flex items-center gap-2 transition-colors"
              onClick={() => {
                handleDuplicate(contextMenu.entry!);
                setContextMenu(null);
              }}
            >
              <Copy size={14} className="text-[#888]" />
              <span>Make a copy</span>
            </button>
          )}
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-[#094771] flex items-center gap-2 transition-colors"
            onClick={() => {
              if (contextMenu.entry) handleMoveTo(contextMenu.entry);
              setContextMenu(null);
            }}
          >
            <FolderInput size={14} className="text-[#888]" />
            <span>Move to...</span>
          </button>

          <div className="border-t border-[#404040] my-1" />

          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-[#094771] flex items-center gap-2 transition-colors"
            onClick={() => {
              if (contextMenu.entry) handleShowInExplorer(contextMenu.entry);
              setContextMenu(null);
            }}
          >
            <ExternalLink size={14} className="text-[#888]" />
            <span>Show in Finder</span>
          </button>

          <div className="border-t border-[#404040] my-1" />

          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-[#094771] flex items-center gap-2 transition-colors"
            onClick={() => {
              if (contextMenu.entry) setRenameModal({ isOpen: true, entry: contextMenu.entry, newName: contextMenu.entry.name });
              setContextMenu(null);
            }}
          >
            <Edit2 size={14} className="text-[#888]" />
            <span>Rename</span>
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-red-900/50 flex items-center gap-2 text-red-400 transition-colors"
            onClick={() => {
              if (contextMenu.entry) handleDelete(contextMenu.entry);
              setContextMenu(null);
            }}
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal.isOpen && renameModal.entry && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRenameModal({ isOpen: false, entry: null, newName: '' });
            }
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-4 w-80">
            <h3 className="text-lg font-semibold mb-3">Rename</h3>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={renameModal.newName}
              onChange={(e) => setRenameModal({ ...renameModal, newName: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setRenameModal({ isOpen: false, entry: null, newName: '' });
              }}
              autoFocus
              onFocus={(e) => {
                // Select filename without extension
                const name = e.target.value;
                const dotIndex = name.lastIndexOf('.');
                if (dotIndex > 0) {
                  e.target.setSelectionRange(0, dotIndex);
                } else {
                  e.target.select();
                }
              }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setRenameModal({ isOpen: false, entry: null, newName: '' })}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                onClick={handleRename}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Links Modal (for moved images) */}
      {updateLinksModal?.isOpen && updateLinksModal.movedImages.length > 0 && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget && !updateLinksModal.isProcessing) {
              setUpdateLinksModal(null);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-5 w-[450px] max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-semibold mb-2">Update Image Links?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {updateLinksModal.movedImages.length === 1 ? (
                <>
                  The image <span className="font-medium text-gray-800 dark:text-gray-200">{updateLinksModal.movedImages[0].oldPath.split('/').pop()}</span> has been moved.
                </>
              ) : (
                <>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{updateLinksModal.movedImages.length} images</span> have been moved.
                </>
              )}
              {' '}Would you like to update all references in your markdown files?
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-500 mb-4 p-2 bg-gray-100 dark:bg-gray-800 rounded max-h-48 overflow-y-auto flex-shrink-0">
              {updateLinksModal.movedImages.map((img, idx) => (
                <div key={idx} className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-200 dark:border-gray-700' : ''}>
                  <div className="truncate"><span className="font-medium">From:</span> {img.oldPath}</div>
                  <div className="truncate"><span className="font-medium">To:</span> {img.newPath}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                onClick={() => setUpdateLinksModal(null)}
                disabled={updateLinksModal.isProcessing}
              >
                No, Keep Old Links
              </button>
              <button
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                onClick={() => handleUpdateImageLinks(updateLinksModal.movedImages)}
                disabled={updateLinksModal.isProcessing}
              >
                {updateLinksModal.isProcessing ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    Updating...
                  </>
                ) : (
                  'Yes, Update Links'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

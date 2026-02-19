import React, { useState, DragEvent, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, FilePlus, FolderPlus, ImagePlus, Folder, Pencil, GitBranch, Code, Kanban, Table, FileText, Plus, ChevronUp, Trash2, Edit2, Copy, FolderInput, ExternalLink, PanelRight, FileSpreadsheet, Globe } from 'lucide-react';
import { FileEntry, useAppStore } from '../../store/store';
import { createFile, createFolder, loadFileStructure } from '../../lib/fileSystem';
import clsx from 'clsx';

// Path utilities - handle both forward and backward slashes
const getFileName = (path: string): string => {
  const lastSep = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return lastSep >= 0 ? path.substring(lastSep + 1) : path;
};

const getParentDir = (path: string): string => {
  const lastSep = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return lastSep >= 0 ? path.substring(0, lastSep) : '';
};

const joinPath = (base: string, name: string): string => {
  // Normalize to forward slashes for consistency
  const normalizedBase = base.replace(/\\/g, '/');
  return `${normalizedBase}/${name}`;
};

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

interface FileNodeProps {
  entry: FileEntry;
  depth?: number;
  onMoveFile: (sourcePath: string, targetFolder: string) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
  onExternalFileDrop: (files: File[], targetFolder: string) => void;
}

const FileNode: React.FC<FileNodeProps> = ({ entry, depth = 0, onMoveFile, onContextMenu, onExternalFileDrop }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const { openFile, activeFile } = useAppStore();

  const handleClick = () => {
    if (entry.isDirectory) {
      setIsOpen(!isOpen);
    } else {
      openFile(entry.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, entry);
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', entry.path);
    e.dataTransfer.effectAllowed = 'move';
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
      
      // Internal file move
      const sourcePath = e.dataTransfer.getData('text/plain');
      if (sourcePath && sourcePath !== entry.path) {
        onMoveFile(sourcePath, entry.path);
      }
    }
  };

  return (
    <div>
      <div 
        className={clsx(
          "flex items-center py-1 px-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 select-none transition-colors",
          activeFile === entry.path && "bg-blue-100 dark:bg-blue-900",
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
        <span className="mr-1 text-gray-500">
          {entry.isDirectory ? (
            isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          ) : (
            <File size={16} />
          )}
        </span>
        <span className="truncate text-sm">{entry.name}</span>
      </div>
      {isOpen && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileNode key={child.path} entry={child} depth={depth + 1} onMoveFile={onMoveFile} onContextMenu={onContextMenu} onExternalFileDrop={onExternalFileDrop} />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileExplorer: React.FC = () => {
  const { fileStructure, currentPath, setFileStructure, closeFile, renameFileContent } = useAppStore();
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const quickCreateRef = useRef<HTMLDivElement>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry: FileEntry } | null>(null);
  const [renameModal, setRenameModal] = useState<{ isOpen: boolean; entry: FileEntry | null; newName: string }>({
    isOpen: false,
    entry: null,
    newName: ''
  });

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

  const handleRename = async () => {
    if (!renameModal.entry || !renameModal.newName.trim()) return;
    
    const oldPath = renameModal.entry.path;
    const parentDir = getParentDir(oldPath);
    const newPath = joinPath(parentDir, renameModal.newName);
    
    try {
      await window.electronAPI.moveFile(oldPath, newPath);
      // Update store to reflect the renamed file
      renameFileContent(oldPath, newPath);
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
    
    const parentDir = getParentDir(entry.path);
    while (await window.electronAPI.exists(joinPath(parentDir, newName))) {
      newName = `${baseName} copy ${counter}${ext}`;
      counter++;
    }
    
    try {
      await window.electronAPI.copyFile(entry.path, joinPath(parentDir, newName));
      await refreshFileStructure();
    } catch (e) {
      console.error("Failed to duplicate", e);
      alert("Failed to duplicate: " + (e as Error).message);
    }
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
          const fileName = getFileName(filePath) || file.name;
          let destPath = joinPath(targetFolder, fileName);
          
          // Check if file already exists, append number if so
          let counter = 1;
          const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';
          const baseName = fileName.replace(ext, '');
          while (await window.electronAPI.exists(destPath)) {
            destPath = joinPath(targetFolder, `${baseName} (${counter})${ext}`);
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
        const destPath = joinPath(targetFolder, fileName);
        await window.electronAPI.moveFile(entry.path, destPath);
        // Update store to reflect the moved file
        renameFileContent(entry.path, destPath);
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
    
    while (await window.electronAPI.exists(joinPath(currentPath, name))) {
      name = `Untitled ${counter}${extension}`;
      counter++;
    }
    
    return name;
  };

  const handleMoveFile = async (sourcePath: string, targetFolder: string) => {
    try {
      const fileName = getFileName(sourcePath);
      if (!fileName) return;
      
      const destPath = joinPath(targetFolder, fileName);
      
      // Don't move if destination is the same as source parent
      const sourceParent = getParentDir(sourcePath);
      // Normalize both paths for comparison
      const normalizedSourceParent = sourceParent.replace(/\\/g, '/');
      const normalizedTargetFolder = targetFolder.replace(/\\/g, '/');
      if (normalizedSourceParent === normalizedTargetFolder) return;
      
      await window.electronAPI.moveFile(sourcePath, destPath);
      // Update store to reflect the moved file
      renameFileContent(sourcePath, destPath);
      await refreshFileStructure();
    } catch (e) {
      console.error("Failed to move file", e);
      alert("Failed to move file: " + (e as Error).message);
    }
  };

  const handleQuickCreate = async (fileType: typeof FILE_TYPES[0]) => {
    if (!currentPath) return;
    setIsQuickCreateOpen(false);
    
    try {
      const fileName = await generateUntitledName(fileType.extension);
      const fullPath = joinPath(currentPath, fileName);
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
      while (await window.electronAPI.exists(joinPath(currentPath, folderName))) {
        folderName = `Untitled Folder ${counter}`;
        counter++;
      }
      
      const fullPath = joinPath(currentPath, folderName);
      await createFolder(fullPath);
      const files = await loadFileStructure(currentPath);
      setFileStructure(files);
    } catch (e) {
      console.error("Failed to create folder", e);
      alert("Failed to create folder");
    }
  };

  const handleImportImage = async () => {
    if (!currentPath) return;
    try {
      const selected = await window.electronAPI.openFile({
        filters: [{
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
        }]
      });

      if (selected && typeof selected === 'string') {
        const fileName = getFileName(selected);
        if (fileName) {
          const destPath = joinPath(currentPath, fileName);
          await window.electronAPI.copyFile(selected, destPath);
          const files = await loadFileStructure(currentPath);
          setFileStructure(files);
        }
      }
    } catch (e) {
      console.error("Failed to import image", e);
      alert("Failed to import image");
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
            const fileName = getFileName(filePath) || file.name;
            let destPath = joinPath(currentPath, fileName);
            
            // Check if file already exists, append number if so
            let counter = 1;
            const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';
            const baseName = fileName.replace(ext, '');
            while (await window.electronAPI.exists(destPath)) {
              destPath = joinPath(currentPath, `${baseName} (${counter})${ext}`);
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
    <div className="w-full h-full bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="p-2 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center relative">
        <span className="font-semibold text-sm uppercase text-gray-500 truncate mr-1 min-w-0 flex-1">Explorer</span>
        <div className="flex space-x-1 flex-shrink-0">
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
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[160px] py-1">
                {FILE_TYPES.map((fileType) => {
                  const Icon = fileType.icon;
                  return (
                    <button
                      key={fileType.extension}
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                      onClick={() => handleQuickCreate(fileType)}
                    >
                      <Icon size={14} className="text-gray-500" />
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
          <button 
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded" 
            title="Import Image"
            onClick={handleImportImage}
          >
            <ImagePlus size={16} />
          </button>
        </div>
      </div>
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
          fileStructure.map((entry) => (
            <FileNode key={entry.path} entry={entry} onMoveFile={handleMoveFile} onContextMenu={handleFileContextMenu} onExternalFileDrop={handleExternalFileDrop} />
          ))
        ) : (
          <div className="p-4 text-center text-gray-500 text-sm">
            No folder opened
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {!contextMenu.entry.isDirectory && (
            <button
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              onClick={() => {
                handleOpenToRight(contextMenu.entry);
                setContextMenu(null);
              }}
            >
              <PanelRight size={14} className="text-gray-500" />
              <span>Open to the right</span>
            </button>
          )}
          
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          
          {!contextMenu.entry.isDirectory && (
            <button
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              onClick={() => {
                handleDuplicate(contextMenu.entry);
                setContextMenu(null);
              }}
            >
              <Copy size={14} className="text-gray-500" />
              <span>Make a copy</span>
            </button>
          )}
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            onClick={() => {
              handleMoveTo(contextMenu.entry);
              setContextMenu(null);
            }}
          >
            <FolderInput size={14} className="text-gray-500" />
            <span>Move file to...</span>
          </button>
          
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            onClick={() => {
              handleShowInExplorer(contextMenu.entry);
              setContextMenu(null);
            }}
          >
            <ExternalLink size={14} className="text-gray-500" />
            <span>Show in explorer</span>
          </button>
          
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            onClick={() => {
              setRenameModal({ isOpen: true, entry: contextMenu.entry, newName: contextMenu.entry.name });
              setContextMenu(null);
            }}
          >
            <Edit2 size={14} className="text-gray-500" />
            <span>Rename</span>
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center gap-2 text-red-600 dark:text-red-400"
            onClick={() => {
              handleDelete(contextMenu.entry);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setRenameModal({ isOpen: false, entry: null, newName: '' })}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-4 w-80" onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
};

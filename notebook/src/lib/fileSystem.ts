// File system operations using Electron IPC
import { FileEntry } from '../store/store';

// Cross-platform path separator - use forward slash which works on all platforms
// Node.js path.normalize will handle conversion on Windows
const pathJoin = (base: string, name: string): string => {
  // Normalize to forward slashes for consistency
  const normalizedBase = base.replace(/\\/g, '/');
  return `${normalizedBase}/${name}`;
};

// Hidden/metadata file patterns that should not be shown in explorer
const HIDDEN_PATTERNS = [
  /^\./, // Files starting with dot
  /\.notebook-history$/, // Version history folder
  /^\.git$/, // Git folder
  /^\.obsidian$/, // Obsidian config
  /^\.vscode$/, // VSCode config
  /^node_modules$/, // Node modules
  /^\.DS_Store$/, // macOS files
  /^Thumbs\.db$/, // Windows thumbnails
  /^desktop\.ini$/, // Windows config
];

// Check if a file/folder should be hidden
export const isHiddenFile = (name: string): boolean => {
  return HIDDEN_PATTERNS.some(pattern => pattern.test(name));
};

export const openFolder = async (): Promise<string | null> => {
  return await window.electronAPI.openFolder();
};

export const loadFileStructure = async (path: string, recursive: boolean = true, showHidden: boolean = false): Promise<FileEntry[]> => {
  const entries = await window.electronAPI.readDir(path);
  const result: FileEntry[] = [];

  for (const entry of entries) {
    // Skip hidden files unless explicitly requested
    if (!showHidden && isHiddenFile(entry.name)) {
      continue;
    }
    
    const fullPath = pathJoin(path, entry.name);
    let children: FileEntry[] | undefined = undefined;
    
    if (entry.isDirectory) {
      // Recursively load children for directories
      children = recursive ? await loadFileStructure(fullPath, true, showHidden) : [];
    }
    
    result.push({
      name: entry.name,
      path: fullPath,
      isDirectory: entry.isDirectory,
      children,
    });
  }
  
  // Sort: Folders first, then files
  return result.sort((a, b) => {
    if (a.isDirectory === b.isDirectory) {
      return a.name.localeCompare(b.name);
    }
    return a.isDirectory ? -1 : 1;
  });
};

export const readFileContent = async (path: string): Promise<string> => {
  if (path.toLowerCase().endsWith('.pdf')) {
    const bytes = await window.electronAPI.readFile(path);
    // Convert Uint8Array to Base64 string efficiently
    const binary = Array.from(new Uint8Array(bytes))
      .map((b) => String.fromCharCode(b))
      .join('');
    return btoa(binary);
  }
  return await window.electronAPI.readTextFile(path);
};

export const saveFileContent = async (path: string, content: string): Promise<void> => {
  await window.electronAPI.writeTextFile(path, content);
};

export const createFolder = async (path: string): Promise<void> => {
  await window.electronAPI.mkdir(path);
};

export const createFile = async (path: string, content: string = ''): Promise<void> => {
  await window.electronAPI.writeTextFile(path, content);
};

export const saveImage = async (path: string, data: Uint8Array): Promise<void> => {
  await window.electronAPI.writeFile(path, data);
};

export const renameFile = async (oldPath: string, newPath: string): Promise<void> => {
  await window.electronAPI.moveFile(oldPath, newPath);
};

export const deleteFile = async (path: string): Promise<void> => {
  await window.electronAPI.deleteFile(path);
};

export const copyFile = async (srcPath: string, destPath: string): Promise<void> => {
  await window.electronAPI.copyFile(srcPath, destPath);
};

export const fileExists = async (path: string): Promise<boolean> => {
  return await window.electronAPI.exists(path);
};

// Get file extension
export const getFileExtension = (path: string): string => {
  const parts = path.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

// Get file name without extension
export const getFileName = (path: string): string => {
  const name = path.split(/[/\\]/).pop() || path;
  const dotIndex = name.lastIndexOf('.');
  return dotIndex > 0 ? name.substring(0, dotIndex) : name;
};

// Get parent directory
export const getParentDir = (path: string): string => {
  const parts = path.replace(/\\/g, '/').split('/');
  parts.pop();
  return parts.join('/');
};

// File system operations using Electron IPC
import { FileEntry } from '../store/store';

export const openFolder = async (): Promise<string | null> => {
  return await window.electronAPI.openFolder();
};

export const loadFileStructure = async (path: string): Promise<FileEntry[]> => {
  const entries = await window.electronAPI.readDir(path);
  const result: FileEntry[] = [];

  for (const entry of entries) {
    const fullPath = `${path}\\${entry.name}`; // Windows path separator
    result.push({
      name: entry.name,
      path: fullPath,
      isDirectory: entry.isDirectory,
      children: entry.isDirectory ? [] : undefined,
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

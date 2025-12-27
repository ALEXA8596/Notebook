import { readDir, readTextFile, writeTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { FileEntry } from '../store/store';

export const openFolder = async (): Promise<string | null> => {
  const selected = await open({
    directory: true,
    multiple: false,
  });
  return selected as string | null;
};

export const loadFileStructure = async (path: string): Promise<FileEntry[]> => {
  const entries = await readDir(path);
  const result: FileEntry[] = [];

  for (const entry of entries) {
    const fullPath = `${path}\\${entry.name}`; // Windows path separator, ideally use path.join if available or handle OS
    result.push({
      name: entry.name,
      path: fullPath,
      isDirectory: entry.isDirectory,
      children: entry.isDirectory ? [] : undefined, // Lazy load or recursive? For now flat or simple recursive if needed
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
  return await readTextFile(path);
};

export const saveFileContent = async (path: string, content: string): Promise<void> => {
  await writeTextFile(path, content);
};

export const createFolder = async (path: string): Promise<void> => {
  await mkdir(path);
};

export const createFile = async (path: string, content: string = ''): Promise<void> => {
  await writeTextFile(path, content);
};

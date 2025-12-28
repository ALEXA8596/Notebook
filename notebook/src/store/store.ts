import { create } from 'zustand';

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

interface AppState {
  currentPath: string | null;
  fileStructure: FileEntry[];
  openFiles: string[]; // paths of open files
  activeFile: string | null; // path of active file
  unsavedChanges: Set<string>; // paths of files with unsaved changes
  fileContents: Record<string, string>;
  theme: 'obsidian' | 'dark' | 'light';
  
  setCurrentPath: (path: string) => void;
  setFileStructure: (files: FileEntry[]) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  setUnsaved: (path: string, unsaved: boolean) => void;
  setFileContent: (path: string, content: string) => void;
  setTheme: (theme: 'obsidian' | 'dark' | 'light') => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPath: null,
  fileStructure: [],
  openFiles: [],
  activeFile: null,
  unsavedChanges: new Set(),
  fileContents: {},
  theme: 'dark',

  setCurrentPath: (path) => set({ currentPath: path }),
  setFileStructure: (files) => set({ fileStructure: files }),
  openFile: (path) => set((state) => {
    if (!state.openFiles.includes(path)) {
      return { openFiles: [...state.openFiles, path], activeFile: path };
    }
    return { activeFile: path };
  }),
  closeFile: (path) => set((state) => {
    const newOpenFiles = state.openFiles.filter((p) => p !== path);
    let newActiveFile = state.activeFile;
    if (state.activeFile === path) {
      newActiveFile = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null;
    }
    // Clean up content if needed, but maybe keep for cache
    return { openFiles: newOpenFiles, activeFile: newActiveFile };
  }),
  setActiveFile: (path) => set({ activeFile: path }),
  setUnsaved: (path, unsaved) => set((state) => {
    const newUnsaved = new Set(state.unsavedChanges);
    if (unsaved) {
      newUnsaved.add(path);
    } else {
      newUnsaved.delete(path);
    }
    return { unsavedChanges: newUnsaved };
  }),
  setFileContent: (path, content) => set((state) => ({
    fileContents: { ...state.fileContents, [path]: content }
  })),
  setTheme: (theme) => set({ theme }),
}));

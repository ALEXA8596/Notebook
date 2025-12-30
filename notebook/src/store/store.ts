import { create } from 'zustand';

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

export interface AIProvider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface FileVersion {
  id: string;
  filePath: string;
  timestamp: number;
  content: string;
}

interface AppState {
  currentPath: string | null;
  fileStructure: FileEntry[];
  openFiles: string[]; // paths of open files
  activeFile: string | null; // path of active file
  viewedHistory: string[]; // most recently viewed files (most recent last)
  unsavedChanges: Set<string>; // paths of files with unsaved changes
  fileContents: Record<string, string>;
  theme: 'obsidian' | 'dark' | 'light';
  
  // AI Settings
  aiProviders: AIProvider[];
  selectedAIProvider: string | null;
  
  // Autosave Settings
  autosaveEnabled: boolean;
  autosaveInterval: number; // in seconds
  
  // Version History
  versionHistoryEnabled: boolean;
  maxVersionsPerFile: number;
  // Tool execution mode: 'ask' (default) or 'allow_all'
  toolExecutionMode: 'ask' | 'allow_all';
  
  setCurrentPath: (path: string) => void;
  setFileStructure: (files: FileEntry[]) => void;
  openFile: (path: string) => void;
  markFileViewed: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  setUnsaved: (path: string, unsaved: boolean) => void;
  setFileContent: (path: string, content: string) => void;
  setTheme: (theme: 'obsidian' | 'dark' | 'light') => void;
  
  // AI Actions
  addAIProvider: (provider: AIProvider) => void;
  removeAIProvider: (id: string) => void;
  updateAIProvider: (id: string, updates: Partial<AIProvider>) => void;
  setSelectedAIProvider: (id: string | null) => void;
  
  // Autosave Actions
  setAutosaveEnabled: (enabled: boolean) => void;
  setAutosaveInterval: (interval: number) => void;
  
  // Version History Actions
  setVersionHistoryEnabled: (enabled: boolean) => void;
  setMaxVersionsPerFile: (max: number) => void;
  setToolExecutionMode: (mode: 'ask' | 'allow_all') => void;
}

// Load AI settings from localStorage
const loadAISettings = (): { aiProviders: AIProvider[]; selectedAIProvider: string | null } => {
  try {
    const saved = localStorage.getItem('ai-settings');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load AI settings', e);
  }
  return { aiProviders: [], selectedAIProvider: null };
};

// Save AI settings to localStorage
const saveAISettings = (providers: AIProvider[], selected: string | null) => {
  try {
    localStorage.setItem('ai-settings', JSON.stringify({ aiProviders: providers, selectedAIProvider: selected }));
  } catch (e) {
    console.error('Failed to save AI settings', e);
  }
};

// Load general settings from localStorage
const loadGeneralSettings = (): { 
  autosaveEnabled: boolean; 
  autosaveInterval: number;
  versionHistoryEnabled: boolean;
  maxVersionsPerFile: number;
  toolExecutionMode?: 'ask' | 'allow_all';
} => {
  try {
    const saved = localStorage.getItem('general-settings');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load general settings', e);
  }
  return { 
    autosaveEnabled: true, 
    autosaveInterval: 30,
    versionHistoryEnabled: true,
    maxVersionsPerFile: 20,
    toolExecutionMode: 'ask'
  };
};

// Save general settings to localStorage
const saveGeneralSettings = (settings: { 
  autosaveEnabled: boolean; 
  autosaveInterval: number;
  versionHistoryEnabled: boolean;
  maxVersionsPerFile: number;
  toolExecutionMode?: 'ask' | 'allow_all';
}) => {
  try {
    localStorage.setItem('general-settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save general settings', e);
  }
};

const initialAISettings = loadAISettings();
const initialGeneralSettings = loadGeneralSettings();

export const useAppStore = create<AppState>((set, get) => ({
  currentPath: null,
  fileStructure: [],
  openFiles: [],
  activeFile: null,
  unsavedChanges: new Set(),
  fileContents: {},
  viewedHistory: [],
  theme: 'dark',
  
  // AI State
  aiProviders: initialAISettings.aiProviders,
  selectedAIProvider: initialAISettings.selectedAIProvider,
  
  // Autosave State
  autosaveEnabled: initialGeneralSettings.autosaveEnabled,
  autosaveInterval: initialGeneralSettings.autosaveInterval,
  
  // Version History State
  versionHistoryEnabled: initialGeneralSettings.versionHistoryEnabled,
  maxVersionsPerFile: initialGeneralSettings.maxVersionsPerFile,
  toolExecutionMode: initialGeneralSettings.toolExecutionMode || 'ask',

  setCurrentPath: (path) => set({ currentPath: path }),
  setFileStructure: (files) => set({ fileStructure: files }),
  openFile: (path) => set((state) => {
    if (!state.openFiles.includes(path)) {
      const newOpen = [...state.openFiles, path];
      const newViewed = [...state.viewedHistory.filter(p => p !== path), path];
      return { openFiles: newOpen, activeFile: path, viewedHistory: newViewed };
    }
    // Update viewed history and active file
    const newViewed = [...state.viewedHistory.filter(p => p !== path), path];
    return { activeFile: path, viewedHistory: newViewed };
  }),
  markFileViewed: (path) => set((state) => ({ viewedHistory: [...state.viewedHistory.filter(p => p !== path), path] })),
  closeFile: (path) => set((state) => {
    const newOpenFiles = state.openFiles.filter((p) => p !== path);
    let newActiveFile = state.activeFile;
    if (state.activeFile === path) {
      newActiveFile = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null;
    }
    // Clean up content if needed, but maybe keep for cache
    return { openFiles: newOpenFiles, activeFile: newActiveFile };
  }),
  setActiveFile: (path) => set((state) => ({ activeFile: path, viewedHistory: [...state.viewedHistory.filter(p => p !== path), path] })),
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
  
  // AI Actions
  addAIProvider: (provider) => set((state) => {
    const newProviders = [...state.aiProviders, provider];
    saveAISettings(newProviders, state.selectedAIProvider);
    return { aiProviders: newProviders };
  }),
  removeAIProvider: (id) => set((state) => {
    const newProviders = state.aiProviders.filter(p => p.id !== id);
    const newSelected = state.selectedAIProvider === id ? null : state.selectedAIProvider;
    saveAISettings(newProviders, newSelected);
    return { aiProviders: newProviders, selectedAIProvider: newSelected };
  }),
  updateAIProvider: (id, updates) => set((state) => {
    const newProviders = state.aiProviders.map(p => p.id === id ? { ...p, ...updates } : p);
    saveAISettings(newProviders, state.selectedAIProvider);
    return { aiProviders: newProviders };
  }),
  setSelectedAIProvider: (id) => set((state) => {
    saveAISettings(state.aiProviders, id);
    return { selectedAIProvider: id };
  }),
  
  // Autosave Actions
  setAutosaveEnabled: (enabled) => set((state) => {
    const settings = {
      autosaveEnabled: enabled,
      autosaveInterval: state.autosaveInterval,
      versionHistoryEnabled: state.versionHistoryEnabled,
      maxVersionsPerFile: state.maxVersionsPerFile,
      toolExecutionMode: state.toolExecutionMode,
    };
    saveGeneralSettings(settings);
    return { autosaveEnabled: enabled };
  }),
  setAutosaveInterval: (interval) => set((state) => {
    const settings = {
      autosaveEnabled: state.autosaveEnabled,
      autosaveInterval: interval,
      versionHistoryEnabled: state.versionHistoryEnabled,
      maxVersionsPerFile: state.maxVersionsPerFile,
      toolExecutionMode: state.toolExecutionMode,
    };
    saveGeneralSettings(settings);
    return { autosaveInterval: interval };
  }),
  
  // Version History Actions
  setVersionHistoryEnabled: (enabled) => set((state) => {
    const settings = {
      autosaveEnabled: state.autosaveEnabled,
      autosaveInterval: state.autosaveInterval,
      versionHistoryEnabled: enabled,
      maxVersionsPerFile: state.maxVersionsPerFile,
      toolExecutionMode: state.toolExecutionMode,
    };
    saveGeneralSettings(settings);
    return { versionHistoryEnabled: enabled };
  }),
  setMaxVersionsPerFile: (max) => set((state) => {
    const settings = {
      autosaveEnabled: state.autosaveEnabled,
      autosaveInterval: state.autosaveInterval,
      versionHistoryEnabled: state.versionHistoryEnabled,
      maxVersionsPerFile: max,
      toolExecutionMode: state.toolExecutionMode,
    };
    saveGeneralSettings(settings);
    return { maxVersionsPerFile: max };
  }),
  setToolExecutionMode: (mode) => set((state) => {
    const settings = {
      autosaveEnabled: state.autosaveEnabled,
      autosaveInterval: state.autosaveInterval,
      versionHistoryEnabled: state.versionHistoryEnabled,
      maxVersionsPerFile: state.maxVersionsPerFile,
      toolExecutionMode: mode,
    };
    saveGeneralSettings(settings);
    return { toolExecutionMode: mode };
  }),
}));

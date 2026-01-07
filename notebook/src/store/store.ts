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

// Workspace/Vault management
export interface Workspace {
  id: string;
  name: string;
  path: string;
  lastOpened: number;
  icon?: string;
  color?: string;
}

// Encrypted note tracking
export interface EncryptedNoteInfo {
  path: string;
  isLocked: boolean;
  lastUnlocked?: number;
}

// Notification preferences
export interface NotificationPreferences {
  enabled: boolean;
  taskReminders: boolean;
  dailyDigest: boolean;
  dailyDigestTime: string; // HH:mm format
  soundEnabled: boolean;
}

// Sidebar customization
export interface SidebarConfig {
  visibleItems: string[];
  collapsed: boolean;
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
  
  // Recent files (persisted for quick access)
  recentFiles: string[];
  maxRecentFiles: number;
  
  // Workspace Management
  workspaces: Workspace[];
  recentWorkspaces: string[]; // paths of recent workspaces
  
  // Encrypted Notes
  encryptedNotes: Record<string, EncryptedNoteInfo>;
  autoLockTimeout: number; // minutes
  
  // Notifications
  notifications: NotificationPreferences;
  
  // Sidebar customization
  sidebarConfig: SidebarConfig;
  
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
  // Copilot display mode: 'split' (in tab) or 'popup' (separate window)
  copilotDisplayMode: 'split' | 'popup';
  
  setCurrentPath: (path: string) => void;
  setFileStructure: (files: FileEntry[]) => void;
  openFile: (path: string) => void;
  markFileViewed: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  setUnsaved: (path: string, unsaved: boolean) => void;
  setFileContent: (path: string, content: string) => void;
  removeFileContent: (path: string) => void;
  renameFileContent: (oldPath: string, newPath: string) => void;
  setTheme: (theme: 'obsidian' | 'dark' | 'light') => void;
  
  // Recent Files Actions
  addRecentFile: (path: string) => void;
  clearRecentFiles: () => void;
  setMaxRecentFiles: (max: number) => void;
  
  // Workspace Actions
  addWorkspace: (workspace: Workspace) => void;
  removeWorkspace: (id: string) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  setRecentWorkspaces: (paths: string[]) => void;
  
  // Encrypted Notes Actions
  setEncryptedNote: (path: string, info: Partial<EncryptedNoteInfo>) => void;
  removeEncryptedNote: (path: string) => void;
  lockAllNotes: () => void;
  setAutoLockTimeout: (minutes: number) => void;
  
  // Notification Actions
  setNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void;
  
  // Sidebar Actions
  setSidebarConfig: (config: Partial<SidebarConfig>) => void;
  toggleSidebarItem: (itemId: string) => void;
  
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
  setCopilotDisplayMode: (mode: 'split' | 'popup') => void;
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
  copilotDisplayMode?: 'split' | 'popup';
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
    toolExecutionMode: 'ask',
    copilotDisplayMode: 'split'
  };
};

// Theme persistence
const loadThemePreference = (): 'obsidian' | 'dark' | 'light' => {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'obsidian' || saved === 'dark' || saved === 'light') return saved;
  } catch (e) {
    console.error('Failed to load theme preference', e);
  }
  return 'dark';
};

const saveThemePreference = (theme: 'obsidian' | 'dark' | 'light') => {
  try {
    localStorage.setItem('theme', theme);
  } catch (e) {
    console.error('Failed to save theme preference', e);
  }
};

// Save general settings to localStorage
const saveGeneralSettings = (settings: { 
  autosaveEnabled: boolean; 
  autosaveInterval: number;
  versionHistoryEnabled: boolean;
  maxVersionsPerFile: number;
  toolExecutionMode?: 'ask' | 'allow_all';
  copilotDisplayMode?: 'split' | 'popup';
}) => {
  try {
    localStorage.setItem('general-settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save general settings', e);
  }
};

// Load workspace settings from localStorage
const loadWorkspaceSettings = (): { 
  workspaces: Workspace[]; 
  recentWorkspaces: string[];
} => {
  try {
    const saved = localStorage.getItem('workspace-settings');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load workspace settings', e);
  }
  return { workspaces: [], recentWorkspaces: [] };
};

// Save workspace settings
const saveWorkspaceSettings = (workspaces: Workspace[], recentWorkspaces: string[]) => {
  try {
    localStorage.setItem('workspace-settings', JSON.stringify({ workspaces, recentWorkspaces }));
  } catch (e) {
    console.error('Failed to save workspace settings', e);
  }
};

// Load encrypted notes settings
const loadEncryptedNotesSettings = (): {
  encryptedNotes: Record<string, EncryptedNoteInfo>;
  autoLockTimeout: number;
} => {
  try {
    const saved = localStorage.getItem('encrypted-notes-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Always lock notes on app start for security
      const lockedNotes: Record<string, EncryptedNoteInfo> = {};
      for (const [path, info] of Object.entries(parsed.encryptedNotes || {})) {
        lockedNotes[path] = { ...(info as EncryptedNoteInfo), isLocked: true };
      }
      return { encryptedNotes: lockedNotes, autoLockTimeout: parsed.autoLockTimeout || 5 };
    }
  } catch (e) {
    console.error('Failed to load encrypted notes settings', e);
  }
  return { encryptedNotes: {}, autoLockTimeout: 5 };
};

// Save encrypted notes settings
const saveEncryptedNotesSettings = (
  encryptedNotes: Record<string, EncryptedNoteInfo>, 
  autoLockTimeout: number
) => {
  try {
    localStorage.setItem('encrypted-notes-settings', JSON.stringify({ encryptedNotes, autoLockTimeout }));
  } catch (e) {
    console.error('Failed to save encrypted notes settings', e);
  }
};

// Load notification preferences
const loadNotificationPreferences = (): NotificationPreferences => {
  try {
    const saved = localStorage.getItem('notification-preferences');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load notification preferences', e);
  }
  return {
    enabled: true,
    taskReminders: true,
    dailyDigest: false,
    dailyDigestTime: '09:00',
    soundEnabled: true,
  };
};

// Save notification preferences
const saveNotificationPreferences = (prefs: NotificationPreferences) => {
  try {
    localStorage.setItem('notification-preferences', JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save notification preferences', e);
  }
};

// Default sidebar items
const DEFAULT_SIDEBAR_ITEMS = [
  'home', 'vault', 'graph', 'search', 'daily',
  'tasks', 'calendar', 'insights',
  'whiteboard', 'diagram', 'focus', 'quicknote', 'stickies',
  'copilot', 'command', 'cloud',
  'save', 'folder', 'about', 'settings'
];

// Load sidebar config
const loadSidebarConfig = (): SidebarConfig => {
  try {
    const saved = localStorage.getItem('sidebar-config');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load sidebar config', e);
  }
  return { visibleItems: DEFAULT_SIDEBAR_ITEMS, collapsed: false };
};

// Save sidebar config
const saveSidebarConfig = (config: SidebarConfig) => {
  try {
    localStorage.setItem('sidebar-config', JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save sidebar config', e);
  }
};

// Load recent files
const loadRecentFiles = (): { recentFiles: string[]; maxRecentFiles: number } => {
  try {
    const saved = localStorage.getItem('recent-files');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load recent files', e);
  }
  return { recentFiles: [], maxRecentFiles: 20 };
};

// Save recent files
const saveRecentFiles = (recentFiles: string[], maxRecentFiles: number) => {
  try {
    localStorage.setItem('recent-files', JSON.stringify({ recentFiles, maxRecentFiles }));
  } catch (e) {
    console.error('Failed to save recent files', e);
  }
};

const initialAISettings = loadAISettings();
const initialGeneralSettings = loadGeneralSettings();
const initialWorkspaceSettings = loadWorkspaceSettings();
const initialEncryptedNotesSettings = loadEncryptedNotesSettings();
const initialNotificationPreferences = loadNotificationPreferences();
const initialSidebarConfig = loadSidebarConfig();
const initialRecentFiles = loadRecentFiles();

export const useAppStore = create<AppState>((set, get) => ({
  currentPath: null,
  fileStructure: [],
  openFiles: [],
  activeFile: null,
  unsavedChanges: new Set(),
  fileContents: {},
  viewedHistory: [],
  theme: loadThemePreference(),
  
  // Recent files state
  recentFiles: initialRecentFiles.recentFiles,
  maxRecentFiles: initialRecentFiles.maxRecentFiles,
  
  // Workspace State
  workspaces: initialWorkspaceSettings.workspaces,
  recentWorkspaces: initialWorkspaceSettings.recentWorkspaces,
  
  // Encrypted Notes State
  encryptedNotes: initialEncryptedNotesSettings.encryptedNotes,
  autoLockTimeout: initialEncryptedNotesSettings.autoLockTimeout,
  
  // Notification State
  notifications: initialNotificationPreferences,
  
  // Sidebar State
  sidebarConfig: initialSidebarConfig,
  
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
  copilotDisplayMode: initialGeneralSettings.copilotDisplayMode || 'split',

  setCurrentPath: (path) => set({ currentPath: path }),
  setFileStructure: (files) => set({ fileStructure: files }),
  openFile: (path) => set((state) => {
    // Track in recent files
    const newRecent = [path, ...state.recentFiles.filter(p => p !== path)].slice(0, state.maxRecentFiles);
    saveRecentFiles(newRecent, state.maxRecentFiles);
    
    if (!state.openFiles.includes(path)) {
      const newOpen = [...state.openFiles, path];
      const newViewed = [...state.viewedHistory.filter(p => p !== path), path];
      return { openFiles: newOpen, activeFile: path, viewedHistory: newViewed, recentFiles: newRecent };
    }
    // Update viewed history and active file
    const newViewed = [...state.viewedHistory.filter(p => p !== path), path];
    return { activeFile: path, viewedHistory: newViewed, recentFiles: newRecent };
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
  removeFileContent: (path) => set((state) => {
    const newContents = { ...state.fileContents };
    delete newContents[path];
    const newUnsaved = new Set(state.unsavedChanges);
    newUnsaved.delete(path);
    const newOpenFiles = state.openFiles.filter(p => p !== path);
    const newViewedHistory = state.viewedHistory.filter(p => p !== path);
    const newRecentFiles = state.recentFiles.filter(p => p !== path);
    let newActiveFile = state.activeFile;
    if (state.activeFile === path) {
      newActiveFile = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null;
    }
    // Also clean up encrypted notes tracking
    const newEncryptedNotes = { ...state.encryptedNotes };
    delete newEncryptedNotes[path];
    saveRecentFiles(newRecentFiles, state.maxRecentFiles);
    return { 
      fileContents: newContents, 
      unsavedChanges: newUnsaved, 
      openFiles: newOpenFiles,
      viewedHistory: newViewedHistory,
      recentFiles: newRecentFiles,
      activeFile: newActiveFile,
      encryptedNotes: newEncryptedNotes
    };
  }),
  renameFileContent: (oldPath, newPath) => set((state) => {
    const newContents = { ...state.fileContents };
    if (newContents[oldPath] !== undefined) {
      newContents[newPath] = newContents[oldPath];
      delete newContents[oldPath];
    }
    const newUnsaved = new Set(state.unsavedChanges);
    if (newUnsaved.has(oldPath)) {
      newUnsaved.delete(oldPath);
      newUnsaved.add(newPath);
    }
    const newOpenFiles = state.openFiles.map(p => p === oldPath ? newPath : p);
    const newViewedHistory = state.viewedHistory.map(p => p === oldPath ? newPath : p);
    const newRecentFiles = state.recentFiles.map(p => p === oldPath ? newPath : p);
    const newActiveFile = state.activeFile === oldPath ? newPath : state.activeFile;
    // Update encrypted notes tracking
    const newEncryptedNotes = { ...state.encryptedNotes };
    if (newEncryptedNotes[oldPath]) {
      newEncryptedNotes[newPath] = { ...newEncryptedNotes[oldPath], path: newPath };
      delete newEncryptedNotes[oldPath];
    }
    saveRecentFiles(newRecentFiles, state.maxRecentFiles);
    return { 
      fileContents: newContents, 
      unsavedChanges: newUnsaved,
      openFiles: newOpenFiles,
      viewedHistory: newViewedHistory,
      recentFiles: newRecentFiles,
      activeFile: newActiveFile,
      encryptedNotes: newEncryptedNotes
    };
  }),
  setTheme: (theme) => set(() => {
    saveThemePreference(theme);
    return { theme };
  }),
  
  // Recent Files Actions
  addRecentFile: (path) => set((state) => {
    const newRecent = [path, ...state.recentFiles.filter(p => p !== path)].slice(0, state.maxRecentFiles);
    saveRecentFiles(newRecent, state.maxRecentFiles);
    return { recentFiles: newRecent };
  }),
  clearRecentFiles: () => set((state) => {
    saveRecentFiles([], state.maxRecentFiles);
    return { recentFiles: [] };
  }),
  setMaxRecentFiles: (max) => set((state) => {
    const newRecent = state.recentFiles.slice(0, max);
    saveRecentFiles(newRecent, max);
    return { maxRecentFiles: max, recentFiles: newRecent };
  }),
  
  // Workspace Actions
  addWorkspace: (workspace) => set((state) => {
    const newWorkspaces = [...state.workspaces.filter(w => w.id !== workspace.id), workspace];
    const newRecent = [workspace.path, ...state.recentWorkspaces.filter(p => p !== workspace.path)].slice(0, 10);
    saveWorkspaceSettings(newWorkspaces, newRecent);
    return { workspaces: newWorkspaces, recentWorkspaces: newRecent };
  }),
  removeWorkspace: (id) => set((state) => {
    const workspace = state.workspaces.find(w => w.id === id);
    const newWorkspaces = state.workspaces.filter(w => w.id !== id);
    const newRecent = workspace ? state.recentWorkspaces.filter(p => p !== workspace.path) : state.recentWorkspaces;
    saveWorkspaceSettings(newWorkspaces, newRecent);
    return { workspaces: newWorkspaces, recentWorkspaces: newRecent };
  }),
  updateWorkspace: (id, updates) => set((state) => {
    const newWorkspaces = state.workspaces.map(w => w.id === id ? { ...w, ...updates } : w);
    saveWorkspaceSettings(newWorkspaces, state.recentWorkspaces);
    return { workspaces: newWorkspaces };
  }),
  setRecentWorkspaces: (paths) => set((state) => {
    saveWorkspaceSettings(state.workspaces, paths);
    return { recentWorkspaces: paths };
  }),
  
  // Encrypted Notes Actions
  setEncryptedNote: (path, info) => set((state) => {
    const existingInfo = state.encryptedNotes[path] || { path, isLocked: true };
    const newEncryptedNotes = {
      ...state.encryptedNotes,
      [path]: { ...existingInfo, ...info, path }
    };
    saveEncryptedNotesSettings(newEncryptedNotes, state.autoLockTimeout);
    return { encryptedNotes: newEncryptedNotes };
  }),
  removeEncryptedNote: (path) => set((state) => {
    const { [path]: _, ...rest } = state.encryptedNotes;
    saveEncryptedNotesSettings(rest, state.autoLockTimeout);
    return { encryptedNotes: rest };
  }),
  lockAllNotes: () => set((state) => {
    const lockedNotes: Record<string, EncryptedNoteInfo> = {};
    for (const [path, info] of Object.entries(state.encryptedNotes)) {
      lockedNotes[path] = { ...info, isLocked: true };
    }
    saveEncryptedNotesSettings(lockedNotes, state.autoLockTimeout);
    return { encryptedNotes: lockedNotes };
  }),
  setAutoLockTimeout: (minutes) => set((state) => {
    saveEncryptedNotesSettings(state.encryptedNotes, minutes);
    return { autoLockTimeout: minutes };
  }),
  
  // Notification Actions
  setNotificationPreferences: (prefs) => set((state) => {
    const newPrefs = { ...state.notifications, ...prefs };
    saveNotificationPreferences(newPrefs);
    return { notifications: newPrefs };
  }),
  
  // Sidebar Actions
  setSidebarConfig: (config) => set((state) => {
    const newConfig = { ...state.sidebarConfig, ...config };
    saveSidebarConfig(newConfig);
    return { sidebarConfig: newConfig };
  }),
  toggleSidebarItem: (itemId) => set((state) => {
    const current = state.sidebarConfig.visibleItems;
    const newItems = current.includes(itemId)
      ? current.filter(id => id !== itemId)
      : [...current, itemId];
    const newConfig = { ...state.sidebarConfig, visibleItems: newItems };
    saveSidebarConfig(newConfig);
    return { sidebarConfig: newConfig };
  }),
  
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
      copilotDisplayMode: state.copilotDisplayMode,
    };
    saveGeneralSettings(settings);
    return { toolExecutionMode: mode };
  }),
  setCopilotDisplayMode: (mode) => set((state) => {
    const settings = {
      autosaveEnabled: state.autosaveEnabled,
      autosaveInterval: state.autosaveInterval,
      versionHistoryEnabled: state.versionHistoryEnabled,
      maxVersionsPerFile: state.maxVersionsPerFile,
      toolExecutionMode: state.toolExecutionMode,
      copilotDisplayMode: mode,
    };
    saveGeneralSettings(settings);
    return { copilotDisplayMode: mode };
  }),
}));

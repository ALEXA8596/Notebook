// Type declarations for the Electron API exposed via preload script

interface DirEntry {
  name: string;
  isDirectory: boolean;
}

interface FileFilter {
  name: string;
  extensions: string[];
}

interface AddonMeta {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  source?: string;
  website?: string;
  filePath: string;
  type: 'plugin' | 'theme';
  cssVariables?: Array<{ name: string; default: string; description?: string }>;
}

interface AddonState {
  enabledPlugins: string[];
  enabledThemes: string[];
  pluginPermissions: Record<string, 'limited' | 'partial' | 'full'>;
  pluginSettings: Record<string, Record<string, unknown>>;
  themeVariables: Record<string, Record<string, string>>;
}

interface AddonPaths {
  addons: string;
  plugins: string;
  themes: string;
}

interface AddonsAPI {
  getPaths: () => Promise<AddonPaths>;
  listPlugins: () => Promise<AddonMeta[]>;
  listThemes: () => Promise<AddonMeta[]>;
  readPlugin: (filePath: string) => Promise<string>;
  readTheme: (filePath: string) => Promise<string>;
  uploadPlugin: (sourcePath: string) => Promise<AddonMeta | null>;
  uploadTheme: (sourcePath: string) => Promise<AddonMeta | null>;
  delete: (filePath: string) => Promise<void>;
  loadState: () => Promise<AddonState>;
  saveState: (state: AddonState) => Promise<void>;
  startWatching: () => Promise<boolean>;
  stopWatching: () => Promise<boolean>;
  openFolder: (type: 'plugins' | 'themes') => Promise<void>;
  onPluginChanged: (callback: (data: { eventType: string; filename: string }) => void) => void;
  onThemeChanged: (callback: (data: { eventType: string; filename: string }) => void) => void;
}

interface ElectronAPI {
  // Dialog APIs
  openFolder: () => Promise<string | null>;
  openFile: (options?: { filters?: FileFilter[] }) => Promise<string | null>;
  
  // File System APIs
  readDir: (dirPath: string) => Promise<DirEntry[]>;
  readTextFile: (filePath: string) => Promise<string>;
  readFile: (filePath: string) => Promise<Uint8Array>;
  writeTextFile: (filePath: string, content: string) => Promise<void>;
  writeFile: (filePath: string, data: Uint8Array) => Promise<void>;
  mkdir: (dirPath: string) => Promise<void>;
  exists: (filePath: string) => Promise<boolean>;
  copyFile: (src: string, dest: string) => Promise<void>;
  moveFile: (src: string, dest: string) => Promise<void>;
  deleteFile: (filePath: string) => Promise<void>;
  showInExplorer: (filePath: string) => Promise<void>;
  
  // Menu action listeners
  onMenuAction: (callback: (action: string) => void) => void;
  onFormatAction: (callback: (action: string) => void) => void;

  // Addon System APIs
  addons: AddonsAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};

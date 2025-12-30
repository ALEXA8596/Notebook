// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Dialog APIs
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  openFile: (options?: { filters?: { name: string; extensions: string[] }[] }) => 
    ipcRenderer.invoke('dialog:openFile', options),

  // File System APIs
  readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath),
  readTextFile: (filePath: string) => ipcRenderer.invoke('fs:readTextFile', filePath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeTextFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeTextFile', filePath, content),
  writeFile: (filePath: string, data: Uint8Array) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  mkdir: (dirPath: string) => ipcRenderer.invoke('fs:mkdir', dirPath),
  exists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),
  copyFile: (src: string, dest: string) => ipcRenderer.invoke('fs:copyFile', src, dest),
  moveFile: (src: string, dest: string) => ipcRenderer.invoke('fs:moveFile', src, dest),
  deleteFile: (filePath: string) => ipcRenderer.invoke('fs:deleteFile', filePath),
  showInExplorer: (filePath: string) => ipcRenderer.invoke('fs:showInExplorer', filePath),

  // Menu action listeners
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu-action', (_, action) => callback(action));
  },
  onFormatAction: (callback: (action: string) => void) => {
    ipcRenderer.on('format-action', (_, action) => callback(action));
  },

  // Addon System APIs
  addons: {
    getPaths: () => ipcRenderer.invoke('addons:getPaths'),
    listPlugins: () => ipcRenderer.invoke('addons:listPlugins'),
    listThemes: () => ipcRenderer.invoke('addons:listThemes'),
    readPlugin: (filePath: string) => ipcRenderer.invoke('addons:readPlugin', filePath),
    readTheme: (filePath: string) => ipcRenderer.invoke('addons:readTheme', filePath),
    uploadPlugin: (sourcePath: string) => ipcRenderer.invoke('addons:uploadPlugin', sourcePath),
    uploadTheme: (sourcePath: string) => ipcRenderer.invoke('addons:uploadTheme', sourcePath),
    delete: (filePath: string) => ipcRenderer.invoke('addons:delete', filePath),
    loadState: () => ipcRenderer.invoke('addons:loadState'),
    saveState: (state: unknown) => ipcRenderer.invoke('addons:saveState', state),
    startWatching: () => ipcRenderer.invoke('addons:startWatching'),
    stopWatching: () => ipcRenderer.invoke('addons:stopWatching'),
    openFolder: (type: 'plugins' | 'themes') => ipcRenderer.invoke('addons:openFolder', type),
    onPluginChanged: (callback: (data: { eventType: string; filename: string }) => void) => {
      ipcRenderer.on('addons:pluginChanged', (_, data) => callback(data));
    },
    onThemeChanged: (callback: (data: { eventType: string; filename: string }) => void) => {
      ipcRenderer.on('addons:themeChanged', (_, data) => callback(data));
    },
  },
});

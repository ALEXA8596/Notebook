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
});

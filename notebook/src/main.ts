import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools in development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

// ==========================================
// IPC Handlers for File System Operations
// ==========================================

// Open folder dialog
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (result.canceled) {
    return null;
  }
  return result.filePaths[0];
});

// Read directory contents
ipcMain.handle('fs:readDir', async (_, dirPath: string) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.map((entry) => ({
    name: entry.name,
    isDirectory: entry.isDirectory(),
  }));
});

// Read text file
ipcMain.handle('fs:readTextFile', async (_, filePath: string) => {
  return await fs.readFile(filePath, 'utf-8');
});

// Read binary file (for PDFs, etc.)
ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  const buffer = await fs.readFile(filePath);
  return buffer;
});

// Write text file
ipcMain.handle('fs:writeTextFile', async (_, filePath: string, content: string) => {
  await fs.writeFile(filePath, content, 'utf-8');
});

// Write binary file
ipcMain.handle('fs:writeFile', async (_, filePath: string, data: Uint8Array) => {
  await fs.writeFile(filePath, data);
});

// Create directory
ipcMain.handle('fs:mkdir', async (_, dirPath: string) => {
  await fs.mkdir(dirPath, { recursive: true });
});

// Check if path exists
ipcMain.handle('fs:exists', async (_, filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
});

// Open file dialog (for selecting files)
ipcMain.handle('dialog:openFile', async (_, options: { filters?: { name: string; extensions: string[] }[] }) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: options?.filters,
  });
  if (result.canceled) {
    return null;
  }
  return result.filePaths[0];
});

// Copy file
ipcMain.handle('fs:copyFile', async (_, src: string, dest: string) => {
  await fs.copyFile(src, dest);
});

// Move/rename file
ipcMain.handle('fs:moveFile', async (_, src: string, dest: string) => {
  await fs.rename(src, dest);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

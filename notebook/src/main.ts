import { app, BrowserWindow, ipcMain, dialog, Menu, MenuItemConstructorOptions, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Create the application menu
  const menuTemplate: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New File', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu-action', 'new-file') },
        { label: 'Open Folder...', accelerator: 'CmdOrCtrl+Shift+O', click: () => mainWindow?.webContents.send('menu-action', 'open-folder') },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu-action', 'save') },
        { type: 'separator' },
        { label: 'Quick Switcher', accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu-action', 'quick-switcher') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Format',
      submenu: [
        { label: 'Bold', accelerator: 'CmdOrCtrl+B', click: () => mainWindow?.webContents.send('format-action', 'bold') },
        { label: 'Italic', accelerator: 'CmdOrCtrl+I', click: () => mainWindow?.webContents.send('format-action', 'italic') },
        { label: 'Strikethrough', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow?.webContents.send('format-action', 'strikethrough') },
        { type: 'separator' },
        { label: 'Link to File', accelerator: 'CmdOrCtrl+L', click: () => mainWindow?.webContents.send('format-action', 'link-file') },
        { label: 'Embed File', accelerator: 'CmdOrCtrl+Shift+E', click: () => mainWindow?.webContents.send('format-action', 'embed-file') },
        { label: 'Link to Website', accelerator: 'CmdOrCtrl+K', click: () => mainWindow?.webContents.send('format-action', 'link-external') },
        { type: 'separator' },
        {
          label: 'Heading',
          submenu: [
            { label: 'Heading 1', accelerator: 'CmdOrCtrl+1', click: () => mainWindow?.webContents.send('format-action', 'h1') },
            { label: 'Heading 2', accelerator: 'CmdOrCtrl+2', click: () => mainWindow?.webContents.send('format-action', 'h2') },
            { label: 'Heading 3', accelerator: 'CmdOrCtrl+3', click: () => mainWindow?.webContents.send('format-action', 'h3') },
            { label: 'Heading 4', accelerator: 'CmdOrCtrl+4', click: () => mainWindow?.webContents.send('format-action', 'h4') },
            { label: 'Heading 5', accelerator: 'CmdOrCtrl+5', click: () => mainWindow?.webContents.send('format-action', 'h5') },
            { label: 'Heading 6', accelerator: 'CmdOrCtrl+6', click: () => mainWindow?.webContents.send('format-action', 'h6') },
          ]
        },
        { type: 'separator' },
        { label: 'Blockquote', accelerator: 'CmdOrCtrl+Shift+.', click: () => mainWindow?.webContents.send('format-action', 'blockquote') },
        { label: 'Code Block', accelerator: 'CmdOrCtrl+Shift+C', click: () => mainWindow?.webContents.send('format-action', 'code-block') },
        { label: 'Inline Code', accelerator: 'CmdOrCtrl+`', click: () => mainWindow?.webContents.send('format-action', 'inline-code') },
        { type: 'separator' },
        { label: 'Table', click: () => mainWindow?.webContents.send('format-action', 'table') },
        { label: 'Horizontal Rule', click: () => mainWindow?.webContents.send('format-action', 'hr') },
        { type: 'separator' },
        { label: 'Footnote', click: () => mainWindow?.webContents.send('format-action', 'footnote') },
        { label: 'Subscript', click: () => mainWindow?.webContents.send('format-action', 'subscript') },
        { label: 'Superscript', click: () => mainWindow?.webContents.send('format-action', 'superscript') },
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Graph View', accelerator: 'CmdOrCtrl+G', click: () => mainWindow?.webContents.send('menu-action', 'graph') },
        { label: 'Search', accelerator: 'CmdOrCtrl+Shift+F', click: () => mainWindow?.webContents.send('menu-action', 'search') },
        { label: 'Version History', accelerator: 'CmdOrCtrl+Shift+H', click: () => mainWindow?.webContents.send('menu-action', 'version-history') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => mainWindow?.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5) },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', visible: false, click: () => mainWindow?.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5) },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = await import('electron');
            await shell.openExternal('https://github.com');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

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

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Also handle navigation within the same window
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow navigation to the app itself (dev server or file protocol)
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL && url.startsWith(MAIN_WINDOW_VITE_DEV_SERVER_URL)) {
      return;
    }
    if (url.startsWith('file://')) {
      return;
    }
    // Open external URLs in default browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
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

// Delete file or directory
ipcMain.handle('fs:deleteFile', async (_, filePath: string) => {
  await fs.rm(filePath, { recursive: true, force: true });
});

// Show file in system explorer
ipcMain.handle('fs:showInExplorer', async (_, filePath: string) => {
  const { shell } = await import('electron');
  shell.showItemInFolder(filePath);
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

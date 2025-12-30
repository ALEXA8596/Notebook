import { app, BrowserWindow, ipcMain, dialog, Menu, MenuItemConstructorOptions, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { watch, FSWatcher } from 'node:fs';
import started from 'electron-squirrel-startup';

// ==========================================
// Addon System Types and Helpers
// ==========================================

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
}

// Parse JSDoc metadata from file content
function parseAddonMeta(content: string, filePath: string, type: 'plugin' | 'theme'): AddonMeta | null {
  const metaRegex = /\/\*\*[\s\S]*?\*\//;
  const match = content.match(metaRegex);
  if (!match) return null;

  const block = match[0];
  const getValue = (tag: string): string => {
    const tagRegex = new RegExp(`@${tag}\\s+(.+)`, 'i');
    const m = block.match(tagRegex);
    return m ? m[1].trim() : '';
  };

  const name = getValue('name');
  if (!name) return null;

  // Parse CSS variables for themes: @cssvar --name default "description"
  const cssVariables: Array<{ name: string; default: string; description?: string }> = [];
  if (type === 'theme') {
    const varRegex = /@cssvar\s+(--[\w-]+)\s+([^\s"]+|"[^"]*")(?:\s+"([^"]*)")?/gi;
    let vm;
    while ((vm = varRegex.exec(block))) {
      cssVariables.push({
        name: vm[1],
        default: vm[2].replace(/^"|"$/g, ''),
        description: vm[3] || undefined,
      });
    }
  }

  return {
    id: path.basename(filePath, type === 'plugin' ? '.plugin.js' : '.theme.css'),
    name,
    author: getValue('author'),
    version: getValue('version'),
    description: getValue('description'),
    source: getValue('source') || undefined,
    website: getValue('website') || undefined,
    filePath,
    type,
    cssVariables: cssVariables.length > 0 ? cssVariables : undefined,
  };
}

// Get addons directory path
function getAddonsDir(): string {
  return path.join(app.getPath('userData'), 'addons');
}

function getPluginsDir(): string {
  return path.join(getAddonsDir(), 'plugins');
}

function getThemesDir(): string {
  return path.join(getAddonsDir(), 'themes');
}

function getAddonStateFile(): string {
  return path.join(getAddonsDir(), 'addon-state.json');
}

// Ensure addon directories exist
async function ensureAddonDirs(): Promise<void> {
  await fs.mkdir(getPluginsDir(), { recursive: true });
  await fs.mkdir(getThemesDir(), { recursive: true });
}

// Load addon state from disk
async function loadAddonState(): Promise<AddonState> {
  try {
    const content = await fs.readFile(getAddonStateFile(), 'utf-8');
    return JSON.parse(content);
  } catch {
    return { enabledPlugins: [], enabledThemes: [], pluginPermissions: {}, pluginSettings: {} };
  }
}

// Save addon state to disk
async function saveAddonState(state: AddonState): Promise<void> {
  await ensureAddonDirs();
  await fs.writeFile(getAddonStateFile(), JSON.stringify(state, null, 2), 'utf-8');
}

// File watchers for hot reload
let pluginWatcher: FSWatcher | null = null;
let themeWatcher: FSWatcher | null = null;

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

// ==========================================
// Addon System IPC Handlers
// ==========================================

// Get addons directory paths
ipcMain.handle('addons:getPaths', async () => {
  await ensureAddonDirs();
  return {
    addons: getAddonsDir(),
    plugins: getPluginsDir(),
    themes: getThemesDir(),
  };
});

// List all plugins with metadata
ipcMain.handle('addons:listPlugins', async () => {
  await ensureAddonDirs();
  const dir = getPluginsDir();
  try {
    const files = await fs.readdir(dir);
    const plugins: AddonMeta[] = [];
    for (const file of files) {
      if (file.endsWith('.plugin.js')) {
        const filePath = path.join(dir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const meta = parseAddonMeta(content, filePath, 'plugin');
        if (meta) plugins.push(meta);
      }
    }
    return plugins;
  } catch {
    return [];
  }
});

// List all themes with metadata
ipcMain.handle('addons:listThemes', async () => {
  await ensureAddonDirs();
  const dir = getThemesDir();
  try {
    const files = await fs.readdir(dir);
    const themes: AddonMeta[] = [];
    for (const file of files) {
      if (file.endsWith('.theme.css')) {
        const filePath = path.join(dir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const meta = parseAddonMeta(content, filePath, 'theme');
        if (meta) themes.push(meta);
      }
    }
    return themes;
  } catch {
    return [];
  }
});

// Read plugin content (for execution)
ipcMain.handle('addons:readPlugin', async (_, filePath: string) => {
  return await fs.readFile(filePath, 'utf-8');
});

// Read theme content (CSS)
ipcMain.handle('addons:readTheme', async (_, filePath: string) => {
  return await fs.readFile(filePath, 'utf-8');
});

// Upload/install plugin
ipcMain.handle('addons:uploadPlugin', async (_, sourcePath: string) => {
  await ensureAddonDirs();
  const fileName = path.basename(sourcePath);
  const destPath = path.join(getPluginsDir(), fileName);
  await fs.copyFile(sourcePath, destPath);
  const content = await fs.readFile(destPath, 'utf-8');
  return parseAddonMeta(content, destPath, 'plugin');
});

// Upload/install theme
ipcMain.handle('addons:uploadTheme', async (_, sourcePath: string) => {
  await ensureAddonDirs();
  const fileName = path.basename(sourcePath);
  const destPath = path.join(getThemesDir(), fileName);
  await fs.copyFile(sourcePath, destPath);
  const content = await fs.readFile(destPath, 'utf-8');
  return parseAddonMeta(content, destPath, 'theme');
});

// Delete addon
ipcMain.handle('addons:delete', async (_, filePath: string) => {
  await fs.rm(filePath, { force: true });
});

// Load addon state
ipcMain.handle('addons:loadState', async () => {
  return await loadAddonState();
});

// Save addon state
ipcMain.handle('addons:saveState', async (_, state: AddonState) => {
  await saveAddonState(state);
});

// Start watching addon folders for changes (hot reload)
ipcMain.handle('addons:startWatching', async () => {
  await ensureAddonDirs();
  
  // Stop existing watchers
  if (pluginWatcher) pluginWatcher.close();
  if (themeWatcher) themeWatcher.close();

  pluginWatcher = watch(getPluginsDir(), (eventType, filename) => {
    if (filename && (filename.endsWith('.plugin.js'))) {
      mainWindow?.webContents.send('addons:pluginChanged', { eventType, filename });
    }
  });

  themeWatcher = watch(getThemesDir(), (eventType, filename) => {
    if (filename && (filename.endsWith('.theme.css'))) {
      mainWindow?.webContents.send('addons:themeChanged', { eventType, filename });
    }
  });

  return true;
});

// Stop watching addon folders
ipcMain.handle('addons:stopWatching', async () => {
  if (pluginWatcher) { pluginWatcher.close(); pluginWatcher = null; }
  if (themeWatcher) { themeWatcher.close(); themeWatcher = null; }
  return true;
});

// Open addons folder in file explorer
ipcMain.handle('addons:openFolder', async (_, type: 'plugins' | 'themes') => {
  const dir = type === 'plugins' ? getPluginsDir() : getThemesDir();
  await ensureAddonDirs();
  shell.openPath(dir);
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

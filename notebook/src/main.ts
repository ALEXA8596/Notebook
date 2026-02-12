import { app, BrowserWindow, ipcMain, dialog, Menu, MenuItemConstructorOptions, shell, protocol, net } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { watch, FSWatcher } from 'node:fs';
import http from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
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
let vaultWatcher: FSWatcher | null = null;

// ==========================================
// Vault Path Guards
// ==========================================

interface VaultState {
  currentVaultPath: string | null;
}

const vaultStatePath = () => path.join(app.getPath('userData'), 'vault-state.json');
let currentVaultPath: string | null = null;
const approvedExternalPaths = new Set<string>();
const approvedExternalDirs = new Set<string>();

const normalizePath = (p: string): string => path.resolve(p);
const normalizeCompare = (p: string): string => (process.platform === 'win32' ? p.toLowerCase() : p);

const isSubPath = (target: string, root: string): boolean => {
  const relative = path.relative(normalizeCompare(root), normalizeCompare(target));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const assertInVault = (targetPath: string): string => {
  if (!currentVaultPath) {
    throw new Error('No vault is currently open.');
  }
  const normalized = normalizePath(targetPath);
  if (!isSubPath(normalized, currentVaultPath)) {
    throw new Error('Path is outside the current vault.');
  }
  return normalized;
};

const isApprovedExternalPath = (targetPath: string): boolean => {
  const normalized = normalizePath(targetPath);
  return approvedExternalPaths.has(normalized);
};

const isApprovedExternalDir = (targetPath: string): boolean => {
  const normalized = normalizePath(targetPath);
  for (const dir of approvedExternalDirs) {
    if (isSubPath(normalized, dir)) return true;
  }
  return false;
};

const loadVaultState = async (): Promise<void> => {
  try {
    const data = await fs.readFile(vaultStatePath(), 'utf-8');
    const parsed = JSON.parse(data) as VaultState;
    currentVaultPath = parsed.currentVaultPath ? normalizePath(parsed.currentVaultPath) : null;
  } catch {
    currentVaultPath = null;
  }
};

const saveVaultState = async (): Promise<void> => {
  const state: VaultState = {
    currentVaultPath,
  };
  await fs.writeFile(vaultStatePath(), JSON.stringify(state, null, 2), 'utf-8');
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let copilotWindow: BrowserWindow | null = null;

// Create AI Copilot window
const createCopilotWindow = () => {
  if (copilotWindow && !copilotWindow.isDestroyed()) {
    copilotWindow.focus();
    return;
  }

  copilotWindow = new BrowserWindow({
    width: 500,
    height: 700,
    title: 'AI Copilot',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the copilot page with a special hash
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    copilotWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#copilot`);
  } else {
    copilotWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`), { hash: 'copilot' });
  }

  copilotWindow.on('closed', () => {
    copilotWindow = null;
  });
};

// IPC handler to open copilot window
ipcMain.handle('window:openCopilot', async () => {
  createCopilotWindow();
  return true;
});

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
        { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: () => mainWindow?.webContents.send('menu-action', 'close-tab') },
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
        { label: 'Close Window', accelerator: 'CmdOrCtrl+Shift+W', role: 'close' }
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

const base64UrlEncode = (buffer: Buffer): string => {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const createPkcePair = () => {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
};

const startGoogleAuthFlow = async (clientId: string, scopes: string[], clientSecret?: string) => {
  if (!clientId) {
    throw new Error('Missing Google client ID');
  }

  return new Promise<{ access_token: string; refresh_token?: string; expires_at: number; token_type: string }>((resolve, reject) => {
    let redirectUri = '';
    let baseOrigin = 'http://127.0.0.1';
    let verifier = '';

    const server = http.createServer(async (req, res) => {
      try {
        if (!req.url) {
          res.writeHead(400);
          res.end('Bad Request');
          return;
        }

        const url = new URL(req.url, baseOrigin);
        if (url.pathname !== '/oauth/callback') {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }

        const error = url.searchParams.get('error');
        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h3>Authentication failed. You can close this window.</h3>');
          server.close();
          reject(new Error(error));
          return;
        }

        const code = url.searchParams.get('code');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h3>Authentication complete. You can close this window.</h3>');
        server.close();

        if (!code) {
          reject(new Error('Missing authorization code'));
          return;
        }

        const body = new URLSearchParams({
          client_id: clientId,
          code,
          code_verifier: verifier,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        });
        if (clientSecret) {
          body.set('client_secret', clientSecret);
        }

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });

        const data = await tokenResponse.json().catch(() => ({}));
        if (!tokenResponse.ok) {
          reject(new Error(data.error_description || data.error || 'Token exchange failed'));
          return;
        }

        resolve({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          token_type: data.token_type || 'Bearer',
          expires_at: Date.now() + (data.expires_in * 1000),
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Authentication failed'));
      }
    });

    server.listen(0, '127.0.0.1', async () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Failed to start auth server'));
        return;
      }

      baseOrigin = `http://127.0.0.1:${address.port}`;
      redirectUri = `${baseOrigin}/oauth/callback`;
      const pkce = createPkcePair();
      verifier = pkce.verifier;

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes.join(' '),
        include_granted_scopes: 'true',
        access_type: 'offline',
        prompt: 'consent',
        code_challenge: pkce.challenge,
        code_challenge_method: 'S256',
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      await shell.openExternal(authUrl);
    });
  });
};

ipcMain.handle('auth:googleStart', async (_event, args: { clientId: string; scopes: string[]; clientSecret?: string }) => {
  return startGoogleAuthFlow(args.clientId, args.scopes, args.clientSecret);
});

// Open vault dialog (sets current vault)
ipcMain.handle('dialog:openVault', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled) {
      return null;
    }
    const selected = normalizePath(result.filePaths[0]);
    currentVaultPath = selected;
    await saveVaultState();
    return selected;
  } catch (error) {
    console.error('Failed to open vault dialog:', error);
    throw error;
  }
});

// Open folder dialog
ipcMain.handle('dialog:openFolder', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled) {
      return null;
    }
    return result.filePaths[0];
  } catch (error) {
    console.error('Failed to open folder dialog:', error);
    throw error;
  }
});

// Open folder dialog for move-to (approve external destination)
ipcMain.handle('dialog:openFolderForMove', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled) {
      return null;
    }
    const selected = normalizePath(result.filePaths[0]);
    approvedExternalDirs.add(selected);
    return selected;
  } catch (error) {
    console.error('Failed to open folder dialog for move:', error);
    throw error;
  }
});

// Read directory contents
ipcMain.handle('fs:readDir', async (_, dirPath: string) => {
  try {
    const safePath = assertInVault(dirPath);
    const entries = await fs.readdir(safePath, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
    }));
  } catch (error) {
    console.error('Failed to read directory:', dirPath, error);
    throw error;
  }
});

// Read text file
ipcMain.handle('fs:readTextFile', async (_, filePath: string) => {
  try {
    const safePath = assertInVault(filePath);
    return await fs.readFile(safePath, 'utf-8');
  } catch (error) {
    console.error('Failed to read text file:', filePath, error);
    throw error;
  }
});

// Read binary file (for PDFs, etc.)
ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  try {
    const safePath = assertInVault(filePath);
    const buffer = await fs.readFile(safePath);
    return buffer;
  } catch (error) {
    console.error('Failed to read file:', filePath, error);
    throw error;
  }
});

// Write text file
ipcMain.handle('fs:writeTextFile', async (_, filePath: string, content: string) => {
  try {
    const safePath = assertInVault(filePath);
    await fs.writeFile(safePath, content, 'utf-8');
  } catch (error) {
    console.error('Failed to write text file:', filePath, error);
    throw error;
  }
});

// Write binary file
ipcMain.handle('fs:writeFile', async (_, filePath: string, data: Uint8Array) => {
  try {
    const safePath = assertInVault(filePath);
    await fs.writeFile(safePath, data);
  } catch (error) {
    console.error('Failed to write file:', filePath, error);
    throw error;
  }
});

// Create directory
ipcMain.handle('fs:mkdir', async (_, dirPath: string) => {
  try {
    const safePath = assertInVault(dirPath);
    await fs.mkdir(safePath, { recursive: true });
  } catch (error) {
    console.error('Failed to create directory:', dirPath, error);
    throw error;
  }
});

// Check if path exists
ipcMain.handle('fs:exists', async (_, filePath: string) => {
  try {
    const safePath = assertInVault(filePath);
    await fs.access(safePath);
    return true;
  } catch {
    return false;
  }
});

// Open file dialog (for selecting files)
ipcMain.handle('dialog:openFile', async (_, options: { filters?: { name: string; extensions: string[] }[] }) => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: options?.filters,
    });
    if (result.canceled) {
      return null;
    }
    const selected = normalizePath(result.filePaths[0]);
    approvedExternalPaths.add(selected);
    return selected;
  } catch (error) {
    console.error('Failed to open file dialog:', error);
    throw error;
  }
});

// Copy file
ipcMain.handle('fs:copyFile', async (_, src: string, dest: string) => {
  try {
    const safeDest = assertInVault(dest);
    const normalizedSrc = normalizePath(src);
    const srcAllowed = currentVaultPath ? isSubPath(normalizedSrc, currentVaultPath) : false;
    if (!srcAllowed && !isApprovedExternalPath(normalizedSrc)) {
      throw new Error('Source path is not approved for copying.');
    }
    await fs.copyFile(normalizedSrc, safeDest);
  } catch (error) {
    console.error('Failed to copy file:', src, dest, error);
    throw error;
  }
});

// Move/rename file
ipcMain.handle('fs:moveFile', async (_, src: string, dest: string) => {
  try {
    const safeSrc = assertInVault(src);
    const normalizedDest = normalizePath(dest);
    const destAllowed = (currentVaultPath && isSubPath(normalizedDest, currentVaultPath)) || isApprovedExternalDir(normalizedDest);
    if (!destAllowed) {
      throw new Error('Destination path is not approved for moving.');
    }
    await fs.rename(safeSrc, normalizedDest);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EXDEV') {
      try {
        const safeSrc = assertInVault(src);
        const normalizedDest = normalizePath(dest);
        await fs.cp(safeSrc, normalizedDest, { recursive: true });
        await fs.rm(safeSrc, { recursive: true, force: true });
        return;
      } catch (copyErr) {
        console.error('Failed to move file (copy fallback):', src, dest, copyErr);
        throw copyErr;
      }
    }
    console.error('Failed to move file:', src, dest, error);
    throw error;
  }
});

// Delete file or directory
ipcMain.handle('fs:deleteFile', async (_, filePath: string) => {
  try {
    const safePath = assertInVault(filePath);
    await fs.rm(safePath, { recursive: true, force: true });
  } catch (error) {
    console.error('Failed to delete file:', filePath, error);
    throw error;
  }
});

// Show file in system explorer
ipcMain.handle('fs:showInExplorer', async (_, filePath: string) => {
  try {
    const { shell } = await import('electron');
    const safePath = assertInVault(filePath);
    shell.showItemInFolder(safePath);
  } catch (error) {
    console.error('Failed to show in explorer:', filePath, error);
    throw error;
  }
});

// Approve external paths (used for drag/drop import)
ipcMain.handle('fs:approveExternalPaths', async (_, paths: string[]) => {
  for (const p of paths) {
    try {
      approvedExternalPaths.add(normalizePath(p));
    } catch {
      // ignore invalid paths
    }
  }
  return true;
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

// Install preset theme from bundled examples
ipcMain.handle('addons:installPresetTheme', async (_, filename: string) => {
  await ensureAddonDirs();
  
  // Get path to bundled examples folder
  let examplesDir: string;
  if (app.isPackaged) {
    // In production, examples are in resources/app/examples
    examplesDir = path.join(process.resourcesPath, 'app', 'examples');
  } else {
    // In development, examples are in the project root ../../examples (from .vite/build/)
    examplesDir = path.join(__dirname, '..', '..', 'examples');
  }
  
  const sourcePath = path.join(examplesDir, filename);
  const destPath = path.join(getThemesDir(), filename);
  
  // Check if source exists, with multiple fallback paths
  let sourceExists = false;
  let actualSourcePath = sourcePath;
  
  try {
    await fs.access(sourcePath);
    sourceExists = true;
  } catch {
    // Try alternative path for development
    const altPath = path.join(__dirname, '..', '..', '..', 'examples', filename);
    try {
      await fs.access(altPath);
      sourceExists = true;
      actualSourcePath = altPath;
    } catch {
      // Last resort: try from notebook directory
      const notebookExamplesPath = path.join(__dirname, '..', '..', '..', 'notebook', 'examples', filename);
      try {
        await fs.access(notebookExamplesPath);
        sourceExists = true;
        actualSourcePath = notebookExamplesPath;
      } catch {
        console.error(`Theme not found at: ${sourcePath}, ${altPath}, ${notebookExamplesPath}`);
        throw new Error(`Preset theme not found: ${filename}`);
      }
    }
  }
  
  if (!sourceExists) {
    throw new Error(`Preset theme not found: ${filename}`);
  }
  
  await fs.copyFile(actualSourcePath, destPath);
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

// ==========================================
// Vault File Watcher
// ==========================================

// Set current vault
ipcMain.handle('vault:setCurrent', async (_, vaultPath: string) => {
  const normalized = normalizePath(vaultPath);
  currentVaultPath = normalized;
  await saveVaultState();
  return true;
});

// Get vault status
ipcMain.handle('vault:getStatus', async () => {
  return {
    currentVaultPath,
  };
});

// Start watching a vault folder for changes
ipcMain.handle('vault:startWatching', async (_, vaultPath: string) => {
  const normalized = normalizePath(vaultPath);
  if (!currentVaultPath || !isSubPath(normalized, currentVaultPath)) {
    console.error('Denied vault watcher start: path outside current vault');
    return false;
  }
  // Stop existing watcher
  if (vaultWatcher) {
    vaultWatcher.close();
    vaultWatcher = null;
  }

  try {
    vaultWatcher = watch(normalized, { recursive: true }, (eventType, filename) => {
      if (filename) {
        // Ignore hidden files and temp files
        if (filename.startsWith('.') || filename.includes('~') || filename.endsWith('.tmp')) {
          return;
        }
        mainWindow?.webContents.send('vault:fileChanged', { eventType, filename, vaultPath: normalized });
      }
    });
    return true;
  } catch (err) {
    console.error('Failed to start vault watcher:', err);
    return false;
  }
});

// Stop watching vault folder
ipcMain.handle('vault:stopWatching', async () => {
  if (vaultWatcher) {
    vaultWatcher.close();
    vaultWatcher = null;
  }
  return true;
});

// Register custom protocol for serving local vault files (images, etc.)
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-file', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } }
]);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  // Handle local-file:// protocol requests by serving files from disk
  protocol.handle('local-file', (request) => {
    // URL format: local-file:///C:/path/to/file.png (absolute path encoded in URL)
    const url = new URL(request.url);
    // Decode the pathname — on Windows url.pathname starts with /C:/...
    let filePath = decodeURIComponent(url.pathname);
    // Remove leading slash on Windows (e.g., /C:/... -> C:/...)
    if (process.platform === 'win32' && filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }
    return net.fetch(`file://${filePath}`);
  });

  await loadVaultState();
  createWindow();
});

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

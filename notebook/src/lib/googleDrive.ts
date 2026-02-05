/**
 * Google Drive Integration for Notebook
 * Provides backup and sync functionality to Google Drive
 */

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  parents?: string[];
}

export interface SyncStatus {
  isConnected: boolean;
  lastSync: number | null;
  syncing: boolean;
  error: string | null;
  folderId: string | null;
}

// OAuth2 configuration - these would be set via environment or settings
const GOOGLE_CLIENT_ID = ''; // Set via settings
const GOOGLE_REDIRECT_URI_FALLBACK = 'http://localhost:3000/oauth/callback';
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
];

// Storage keys
const TOKEN_KEY = 'google-drive-token';
const SYNC_STATUS_KEY = 'google-drive-sync-status';
const PKCE_VERIFIER_KEY = 'google-drive-pkce-verifier';

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type: string;
}

interface AuthCallbackResult {
  token?: TokenData;
  code?: string;
  error?: string;
}

// Resolve redirect URI for OAuth (must be registered in Google Cloud Console)
export const getRedirectUri = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/oauth/callback`;
  }
  return GOOGLE_REDIRECT_URI_FALLBACK;
};

const base64UrlEncode = (buffer: Uint8Array): string => {
  let binary = '';
  buffer.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const createCodeVerifier = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
};

const createCodeChallenge = async (verifier: string): Promise<string> => {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
};

// Load stored token
export const getStoredToken = (): TokenData | null => {
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      const token = JSON.parse(stored) as TokenData;
      // Check if token is expired
      if (token.expires_at && Date.now() > token.expires_at) {
        return null; // Token expired
      }
      return token;
    }
  } catch (e) {
    console.error('Failed to load Google Drive token', e);
  }
  return null;
};

// Store token
export const storeToken = (token: TokenData) => {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
};

// Clear token
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SYNC_STATUS_KEY);
};

// Load sync status
export const getSyncStatus = (): SyncStatus => {
  try {
    const stored = localStorage.getItem(SYNC_STATUS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {}
  return {
    isConnected: false,
    lastSync: null,
    syncing: false,
    error: null,
    folderId: null,
  };
};

// Store sync status
export const storeSyncStatus = (status: Partial<SyncStatus>) => {
  const current = getSyncStatus();
  const updated = { ...current, ...status };
  localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(updated));
};

// Generate OAuth URL (Authorization Code with PKCE)
export const getAuthUrl = async (clientId: string): Promise<string> => {
  const codeVerifier = createCodeVerifier();
  const codeChallenge = await createCodeChallenge(codeVerifier);
  localStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    include_granted_scopes: 'true',
    access_type: 'offline',
    prompt: 'consent',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

// Start OAuth flow via system browser + loopback redirect (Electron main)
export const startGoogleAuth = async (clientId: string, clientSecret?: string): Promise<TokenData> => {
  if (!window?.electronAPI?.startGoogleAuth) {
    throw new Error('Google authentication is not available in this environment');
  }
  return window.electronAPI.startGoogleAuth(clientId, GOOGLE_SCOPES, clientSecret);
};

// Parse OAuth callback (hash or query string)
export const parseAuthCallback = (hash: string, search: string = ''): AuthCallbackResult => {
  try {
    const hashParams = new URLSearchParams(hash.replace('#', ''));
    const searchParams = new URLSearchParams(search.replace('?', ''));

    const error = hashParams.get('error') || searchParams.get('error');
    if (error) {
      return { error };
    }

    const accessToken = hashParams.get('access_token');
    const expiresIn = hashParams.get('expires_in');
    const tokenType = hashParams.get('token_type');
    
    if (accessToken && expiresIn) {
      return {
        token: {
          access_token: accessToken,
          token_type: tokenType || 'Bearer',
          expires_at: Date.now() + (parseInt(expiresIn) * 1000),
        },
      };
    }

    const code = searchParams.get('code');
    if (code) {
      return { code };
    }
  } catch (e) {
    console.error('Failed to parse auth callback', e);
  }
  return {};
};

// Exchange authorization code for tokens (PKCE)
export const exchangeAuthCode = async (clientId: string, code: string): Promise<TokenData> => {
  const codeVerifier = localStorage.getItem(PKCE_VERIFIER_KEY);
  if (!codeVerifier) {
    throw new Error('Missing PKCE code verifier');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: codeVerifier,
    redirect_uri: getRedirectUri(),
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Token exchange failed');
  }

  localStorage.removeItem(PKCE_VERIFIER_KEY);

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type || 'Bearer',
    expires_at: Date.now() + (data.expires_in * 1000),
  };
};

// Make authenticated API request
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated with Google Drive');
  }
  
  const response = await fetch(`https://www.googleapis.com/drive/v3${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `${token.token_type} ${token.access_token}`,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API request failed: ${response.status}`);
  }
  
  return response.json();
};

// Get or create Notebook folder in Drive
export const getOrCreateNotebookFolder = async (): Promise<string> => {
  // Check if we have a stored folder ID
  const status = getSyncStatus();
  if (status.folderId) {
    // Verify folder still exists
    try {
      await apiRequest(`/files/${status.folderId}?fields=id,name,trashed`);
      return status.folderId;
    } catch (e) {
      // Folder doesn't exist, create new one
    }
  }
  
  // Search for existing Notebook folder
  const searchResponse = await apiRequest<{ files: DriveFile[] }>(
    `/files?q=${encodeURIComponent("name='Notebook Backup' and mimeType='application/vnd.google-apps.folder' and trashed=false")}&fields=files(id,name)`
  );
  
  if (searchResponse.files.length > 0) {
    const folderId = searchResponse.files[0].id;
    storeSyncStatus({ folderId });
    return folderId;
  }
  
  // Create new folder
  const createResponse = await apiRequest<DriveFile>('/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Notebook Backup',
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  
  storeSyncStatus({ folderId: createResponse.id });
  return createResponse.id;
};

// Upload file to Drive
export const uploadFile = async (
  name: string,
  content: string,
  folderId: string,
  existingFileId?: string
): Promise<DriveFile> => {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated with Google Drive');
  }
  
  const metadata = {
    name,
    mimeType: 'text/plain',
    ...(existingFileId ? {} : { parents: [folderId] }),
  };
  
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: 'text/plain' }));
  
  const endpoint = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  
  const response = await fetch(endpoint, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      'Authorization': `${token.token_type} ${token.access_token}`,
    },
    body: form,
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
  
  return response.json();
};

// Download file from Drive
export const downloadFile = async (fileId: string): Promise<string> => {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated with Google Drive');
  }
  
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        'Authorization': `${token.token_type} ${token.access_token}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  
  return response.text();
};

// List files in Notebook folder
export const listBackupFiles = async (folderId: string): Promise<DriveFile[]> => {
  const response = await apiRequest<{ files: DriveFile[] }>(
    `/files?q=${encodeURIComponent(`'${folderId}' in parents and trashed=false`)}&fields=files(id,name,mimeType,modifiedTime)&orderBy=modifiedTime desc`
  );
  return response.files;
};

// Delete file from Drive
export const deleteFile = async (fileId: string): Promise<void> => {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Not authenticated with Google Drive');
  }
  
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `${token.token_type} ${token.access_token}`,
    },
  });
};

// Sync vault to Drive
export interface SyncProgress {
  total: number;
  current: number;
  currentFile: string;
}

export const syncVaultToDrive = async (
  vaultPath: string,
  files: { path: string; content: string }[],
  onProgress?: (progress: SyncProgress) => void
): Promise<void> => {
  storeSyncStatus({ syncing: true, error: null });
  
  try {
    const folderId = await getOrCreateNotebookFolder();
    const existingFiles = await listBackupFiles(folderId);
    const existingFileMap = new Map(existingFiles.map(f => [f.name, f]));
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.path.replace(/[/\\]/g, '_');
      
      onProgress?.({
        total: files.length,
        current: i + 1,
        currentFile: fileName,
      });
      
      const existing = existingFileMap.get(fileName);
      await uploadFile(fileName, file.content, folderId, existing?.id);
    }
    
    storeSyncStatus({ 
      syncing: false, 
      lastSync: Date.now(), 
      isConnected: true,
      error: null 
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Sync failed';
    storeSyncStatus({ syncing: false, error: errorMessage });
    throw e;
  }
};

// Get user info
export const getUserInfo = async (): Promise<{ name: string; email: string; picture?: string } | null> => {
  const token = getStoredToken();
  if (!token) return null;
  
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `${token.token_type} ${token.access_token}`,
      },
    });
    
    if (!response.ok) return null;
    return response.json();
  } catch (e) {
    return null;
  }
};

// Check if connected
export const isConnected = (): boolean => {
  const token = getStoredToken();
  return token !== null && Date.now() < token.expires_at;
};

// Disconnect
export const disconnect = () => {
  clearToken();
  storeSyncStatus({ isConnected: false, folderId: null });
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  Cloud, CloudOff, RefreshCw, Check, AlertTriangle, 
  User, LogOut, Settings, FolderSync, ChevronRight,
  Clock, HardDrive, Upload, Download, Trash2, ExternalLink
} from 'lucide-react';
import {
  isConnected,
  getAuthUrl,
  parseAuthCallback,
  storeToken,
  getSyncStatus,
  getUserInfo,
  disconnect,
  syncVaultToDrive,
  listBackupFiles,
  getOrCreateNotebookFolder,
  downloadFile,
  deleteFile,
  DriveFile,
  SyncProgress,
  storeSyncStatus,
} from '../lib/googleDrive';
import { useAppStore } from '../store/store';
import { loadFileStructure, readFileContent } from '../lib/fileSystem';
import clsx from 'clsx';

interface CloudSyncPanelProps {
  onClose?: () => void;
}

export const CloudSyncPanel: React.FC<CloudSyncPanelProps> = ({ onClose }) => {
  const { currentPath, fileStructure } = useAppStore();
  const [connected, setConnected] = useState(isConnected());
  const [userInfo, setUserInfo] = useState<{ name: string; email: string; picture?: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [backupFiles, setBackupFiles] = useState<DriveFile[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [clientId, setClientId] = useState(() => localStorage.getItem('google-client-id') || '');
  const [error, setError] = useState<string | null>(null);
  
  // Load user info on mount
  useEffect(() => {
    const loadUserInfo = async () => {
      if (isConnected()) {
        const info = await getUserInfo();
        setUserInfo(info);
        setConnected(true);
        
        // Load backup files
        const status = getSyncStatus();
        if (status.folderId) {
          try {
            const files = await listBackupFiles(status.folderId);
            setBackupFiles(files);
          } catch (e) {
            console.error('Failed to load backup files', e);
          }
        }
      }
    };
    loadUserInfo();
  }, []);
  
  // Listen for OAuth callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'oauth-callback') {
        const token = parseAuthCallback(event.data.hash);
        if (token) {
          storeToken(token);
          storeSyncStatus({ isConnected: true });
          setConnected(true);
          getUserInfo().then(setUserInfo);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  // Track auth check interval for cleanup
  const authCheckIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (authCheckIntervalRef.current) {
        clearInterval(authCheckIntervalRef.current);
      }
    };
  }, []);
  
  // Handle connect
  const handleConnect = () => {
    if (!clientId) {
      setShowSettings(true);
      setError('Please enter your Google Client ID first');
      return;
    }
    
    const authUrl = getAuthUrl(clientId);
    const authWindow = window.open(authUrl, 'Google Auth', 'width=500,height=600');
    
    // Clear any existing interval
    if (authCheckIntervalRef.current) {
      clearInterval(authCheckIntervalRef.current);
    }
    
    // Check for callback
    authCheckIntervalRef.current = setInterval(() => {
      try {
        if (authWindow?.location.hash) {
          window.postMessage({ type: 'oauth-callback', hash: authWindow.location.hash }, '*');
          authWindow.close();
          if (authCheckIntervalRef.current) {
            clearInterval(authCheckIntervalRef.current);
            authCheckIntervalRef.current = null;
          }
        }
      } catch (e) {
        // Cross-origin error, window still on Google
      }
      
      if (authWindow?.closed) {
        if (authCheckIntervalRef.current) {
          clearInterval(authCheckIntervalRef.current);
          authCheckIntervalRef.current = null;
        }
      }
    }, 500);
  };
  
  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
    setConnected(false);
    setUserInfo(null);
    setBackupFiles([]);
  };
  
  // Collect all files from vault
  const collectVaultFiles = useCallback(async (): Promise<{ path: string; content: string }[]> => {
    if (!currentPath) return [];
    
    const files: { path: string; content: string }[] = [];
    
    const processEntry = async (entry: typeof fileStructure[0], basePath: string) => {
      const fullPath = `${basePath}/${entry.name}`;
      
      if (entry.isDirectory && entry.children) {
        for (const child of entry.children) {
          await processEntry(child, fullPath);
        }
      } else if (entry.name.endsWith('.md')) {
        try {
          const content = await readFileContent(entry.path);
          files.push({ path: entry.path.replace(currentPath, ''), content });
        } catch (e) {
          console.error('Failed to read file', entry.path, e);
        }
      }
    };
    
    for (const entry of fileStructure) {
      await processEntry(entry, '');
    }
    
    return files;
  }, [currentPath, fileStructure]);
  
  // Handle sync
  const handleSync = async () => {
    if (!currentPath) {
      setError('No vault open');
      return;
    }
    
    setError(null);
    setSyncing(true);
    setProgress(null);
    
    try {
      const files = await collectVaultFiles();
      await syncVaultToDrive(currentPath, files, setProgress);
      setSyncStatus(getSyncStatus());
      
      // Refresh backup files list
      const status = getSyncStatus();
      if (status.folderId) {
        const files = await listBackupFiles(status.folderId);
        setBackupFiles(files);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
      setProgress(null);
    }
  };
  
  // Save client ID
  const handleSaveClientId = () => {
    localStorage.setItem('google-client-id', clientId);
    setShowSettings(false);
    setError(null);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud size={20} className="text-blue-500" />
            <h2 className="font-semibold">Cloud Sync</h2>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium mb-3 text-sm">Google Cloud Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Google Client ID</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  placeholder="Your Google OAuth Client ID"
                  className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Get this from Google Cloud Console → APIs & Services → Credentials
                </p>
              </div>
              <button
                onClick={handleSaveClientId}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        )}
        
        {/* Connection Status */}
        <div className={clsx(
          "p-4 rounded-lg border",
          connected 
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        )}>
          {connected && userInfo ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {userInfo.picture ? (
                  <img src={userInfo.picture} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <User size={20} className="text-green-600" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm">{userInfo.name}</p>
                  <p className="text-xs text-gray-500">{userInfo.email}</p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                title="Disconnect"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <CloudOff size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Not connected to Google Drive</p>
              <button
                onClick={handleConnect}
                className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 flex items-center gap-2 mx-auto"
              >
                <Cloud size={16} />
                Connect to Google Drive
              </button>
            </div>
          )}
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}
        
        {/* Sync Actions */}
        {connected && (
          <>
            <div className="space-y-2">
              <button
                onClick={handleSync}
                disabled={syncing || !currentPath}
                className={clsx(
                  "w-full p-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors",
                  syncing
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                )}
              >
                <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              
              {progress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{progress.currentFile}</span>
                    <span>{progress.current}/{progress.total}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Last Sync */}
            {syncStatus.lastSync && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock size={12} />
                Last synced: {new Date(syncStatus.lastSync).toLocaleString()}
              </div>
            )}
            
            {/* Backup Files */}
            {backupFiles.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <HardDrive size={14} />
                  Backed Up Files ({backupFiles.length})
                </h3>
                <div className="max-h-64 overflow-auto space-y-1 rounded-lg border border-gray-200 dark:border-gray-700">
                  {backupFiles.slice(0, 20).map(file => (
                    <div key={file.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">
                      <span className="truncate flex-1">{file.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{formatDate(file.modifiedTime)}</span>
                    </div>
                  ))}
                  {backupFiles.length > 20 && (
                    <div className="p-2 text-center text-xs text-gray-500">
                      +{backupFiles.length - 20} more files
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Info */}
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">About Cloud Sync</h4>
          <p className="text-xs text-blue-600 dark:text-blue-300">
            Cloud Sync backs up your notes to Google Drive. Your files are stored in a "Notebook Backup" folder.
            To use this feature, you need to set up a Google Cloud project and enable the Drive API.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CloudSyncPanel;

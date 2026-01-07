// Version History Management
// Stores file versions in a .notebook-history folder within the vault

export interface FileVersion {
  id: string;
  filePath: string;
  timestamp: number;
  content: string;
}

const HISTORY_FOLDER = '.notebook-history';

// Get the history folder path for a vault
export const getHistoryFolderPath = (vaultPath: string): string => {
  return `${vaultPath}/${HISTORY_FOLDER}`;
};

// Get the history file path for a specific file
const getHistoryFilePath = (vaultPath: string, filePath: string): string => {
  // Create a safe filename from the original path
  const relativePath = filePath.replace(vaultPath, '').replace(/\//g, '_').replace(/^_/, '');
  return `${getHistoryFolderPath(vaultPath)}/${relativePath}.history.json`;
};

// Ensure history folder exists
export const ensureHistoryFolder = async (vaultPath: string): Promise<void> => {
  const historyPath = getHistoryFolderPath(vaultPath);
  const exists = await window.electronAPI.exists(historyPath);
  if (!exists) {
    await window.electronAPI.mkdir(historyPath);
  }
};

// Save a new version of a file
export const saveVersion = async (
  vaultPath: string,
  filePath: string,
  content: string,
  maxVersions: number = 20
): Promise<void> => {
  await ensureHistoryFolder(vaultPath);
  
  const historyFilePath = getHistoryFilePath(vaultPath, filePath);
  let versions: FileVersion[] = [];
  
  // Load existing versions
  try {
    const exists = await window.electronAPI.exists(historyFilePath);
    if (exists) {
      const data = await window.electronAPI.readTextFile(historyFilePath);
      versions = JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load version history', e);
    versions = [];
  }
  
  // Check if content is different from the latest version
  if (versions.length > 0 && versions[0].content === content) {
    return; // No changes, don't save duplicate version
  }
  
  // Add new version at the beginning
  const newVersion: FileVersion = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    filePath,
    timestamp: Date.now(),
    content,
  };
  
  versions.unshift(newVersion);
  
  // Trim to max versions
  if (versions.length > maxVersions) {
    versions = versions.slice(0, maxVersions);
  }
  
  // Save versions
  await window.electronAPI.writeTextFile(historyFilePath, JSON.stringify(versions, null, 2));
};

// Get all versions of a file
export const getVersions = async (
  vaultPath: string,
  filePath: string
): Promise<FileVersion[]> => {
  const historyFilePath = getHistoryFilePath(vaultPath, filePath);
  
  try {
    const exists = await window.electronAPI.exists(historyFilePath);
    if (!exists) {
      return [];
    }
    const data = await window.electronAPI.readTextFile(historyFilePath);
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load version history', e);
    return [];
  }
};

// Get a specific version
export const getVersion = async (
  vaultPath: string,
  filePath: string,
  versionId: string
): Promise<FileVersion | null> => {
  const versions = await getVersions(vaultPath, filePath);
  return versions.find(v => v.id === versionId) || null;
};

// Delete a specific version
export const deleteVersion = async (
  vaultPath: string,
  filePath: string,
  versionId: string
): Promise<void> => {
  const historyFilePath = getHistoryFilePath(vaultPath, filePath);
  const versions = await getVersions(vaultPath, filePath);
  const filtered = versions.filter(v => v.id !== versionId);
  await window.electronAPI.writeTextFile(historyFilePath, JSON.stringify(filtered, null, 2));
};

// Clear all versions of a file
export const clearVersions = async (
  vaultPath: string,
  filePath: string
): Promise<void> => {
  const historyFilePath = getHistoryFilePath(vaultPath, filePath);
  try {
    const exists = await window.electronAPI.exists(historyFilePath);
    if (exists) {
      await window.electronAPI.deleteFile(historyFilePath);
    }
  } catch (e) {
    console.error('Failed to clear version history', e);
  }
};

// Format timestamp for display
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - timestamp;
  
  // Less than a minute
  if (diff < 60000) {
    return 'Just now';
  }
  
  // Less than an hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  }
  
  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  // Less than a week
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  
  // Format as date
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

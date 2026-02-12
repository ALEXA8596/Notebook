import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { useAppStore } from '../store/store';
import { getVersions, formatTimestamp, FileVersion, deleteVersion } from '../lib/versionHistory';
import { History, RotateCcw, Trash2, Eye, ChevronDown, ChevronRight } from 'lucide-react';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  onRestore: (content: string) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  filePath,
  onRestore 
}) => {
  const { currentPath } = useAppStore();
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentPath && filePath) {
      loadVersions();
    }
  }, [isOpen, currentPath, filePath]);

  const loadVersions = async () => {
    if (!currentPath) return;
    setLoading(true);
    try {
      const versionList = await getVersions(currentPath, filePath);
      setVersions(versionList);
    } catch (e) {
      console.error('Failed to load versions', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (version: FileVersion) => {
    if (selectedVersion === version.id) {
      setSelectedVersion(null);
      setPreviewContent(null);
    } else {
      setSelectedVersion(version.id);
      setPreviewContent(version.content);
    }
  };

  const handleRestore = (version: FileVersion) => {
    if (confirm(`Restore this version from ${formatTimestamp(version.timestamp)}? This will replace the current content.`)) {
      onRestore(version.content);
      onClose();
    }
  };

  const handleDelete = async (version: FileVersion) => {
    if (!currentPath) return;
    if (confirm('Delete this version? This cannot be undone.')) {
      await deleteVersion(currentPath, filePath, version.id);
      loadVersions();
    }
  };

  const fileName = filePath.split('/').pop() || filePath;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Version History - ${fileName}`}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <History size={48} className="mx-auto mb-4 opacity-50" />
            <p>No version history available for this file.</p>
            <p className="text-sm mt-2">Versions are saved automatically when you save the file.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {versions.map((version, index) => (
              <div key={version.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div 
                  className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    selectedVersion === version.id ? 'bg-gray-50 dark:bg-gray-800' : ''
                  }`}
                  onClick={() => handlePreview(version)}
                >
                  <div className="flex items-center gap-3">
                    {selectedVersion === version.id ? (
                      <ChevronDown size={16} className="text-gray-500" />
                    ) : (
                      <ChevronRight size={16} className="text-gray-500" />
                    )}
                    <div>
                      <div className="font-medium text-sm">
                        {formatTimestamp(version.timestamp)}
                        {index === 0 && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(version.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(version);
                      }}
                      className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                      title="Restore this version"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(version);
                      }}
                      className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                      title="Delete this version"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                {selectedVersion === version.id && previewContent && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                      <Eye size={12} />
                      <span>Preview ({version.content.length} characters)</span>
                    </div>
                    <pre className="text-xs bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 max-h-48 overflow-auto whitespace-pre-wrap font-mono">
                      {previewContent.slice(0, 2000)}
                      {previewContent.length > 2000 && '...'}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p>Versions are stored locally in the <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">.notebook-history</code> folder.</p>
        </div>
      </div>
    </Modal>
  );
};

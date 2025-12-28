import React, { useState } from 'react';
import { Settings, Search, Save, FolderOpen, Network } from 'lucide-react';
import { useAppStore } from '../store/store';
import { openFolder } from '../lib/fileSystem';
import { SettingsModal } from './SettingsModal';

export const Sidebar: React.FC = () => {
  const { setCurrentPath, activeFile, unsavedChanges } = useAppStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleOpenFolder = async () => {
    const path = await openFolder();
    if (path) {
      setCurrentPath(path);
    }
  };

  const handleSave = () => {
    // Trigger save logic (handled globally or via event)
    window.dispatchEvent(new CustomEvent('app-save'));
  };

  const handleOpenGraph = () => {
    window.dispatchEvent(new CustomEvent('app-open-graph'));
  };

  const handleSearch = () => {
    window.dispatchEvent(new CustomEvent('app-toggle-search'));
  };

  return (
    <div className="w-full h-full flex flex-col items-center py-4 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 space-y-6 overflow-hidden">
      <button 
        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded" 
        title="Graph View"
        onClick={handleOpenGraph}
      >
        <Network size={24} />
      </button>
      
      <button 
        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded" 
        title="Search"
        onClick={handleSearch}
      >
        <Search size={24} />
      </button>

      <div className="flex-grow" />

      <button 
        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded relative" 
        title="Save (Ctrl+S)"
        onClick={handleSave}
      >
        <Save size={24} />
        {activeFile && unsavedChanges.has(activeFile) && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white dark:border-gray-900"></span>
        )}
      </button>

      <button 
        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded" 
        title="Open Folder"
        onClick={handleOpenFolder}
      >
        <FolderOpen size={24} />
      </button>

      <button 
        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded" 
        title="Settings"
        onClick={() => setIsSettingsOpen(true)}
      >
        <Settings size={24} />
      </button>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

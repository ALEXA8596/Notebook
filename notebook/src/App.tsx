import { useEffect, useCallback, useState, useRef } from 'react';
import { VaultManager } from './components/VaultManager';
import { Sidebar } from './components/Sidebar';
import { FileExplorer } from './components/FileExplorer';
import { Editor } from './components/editor/Editor';
import { ExcalidrawEmbed } from './components/embeds/ExcalidrawEmbed';
import { MermaidEmbed } from './components/embeds/MermaidEmbed';
import { MonacoEmbed } from './components/embeds/MonacoEmbed';
import { KanbanEmbed } from './components/embeds/KanbanEmbed';
import { SpreadsheetEmbed } from './components/embeds/SpreadsheetEmbed';
import { PDFEmbed } from './components/embeds/PDFEmbed';
import { CSVEmbed } from './components/embeds/CSVEmbed';
import { HTMLEmbed } from './components/embeds/HTMLEmbed';
import { GraphView } from './components/GraphView';
import { SearchModal } from './components/SearchModal';
import { QuickSwitcher } from './components/QuickSwitcher';
import { CopilotPanel } from './components/CopilotPanel';
import { VersionHistoryModal } from './components/VersionHistoryModal';
import { TaskPanel } from './components/TaskPanel';
import { CalendarPanel } from './components/CalendarPanel';
import { InsightsPanel } from './components/InsightsPanel';
import { CommandPaletteProvider } from './components/CommandPalette';
import { EncryptedNoteModal, EncryptedBadge, AutoLockProvider } from './components/EncryptedNote';
import { Homepage } from './components/Homepage';
import { AboutModal } from './components/AboutModal';
import { SettingsModal } from './components/SettingsModal';
import { CloudSyncPanel } from './components/CloudSyncPanel';
import { Whiteboard } from './components/Whiteboard';
import { DiagramMaker } from './components/DiagramMaker';
import { FocusMode } from './components/FocusMode';
import { ScratchPad, FloatingQuickNote, StickiesOverview, PersistentStickies } from './components/ScratchPad';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { isEncryptedContent } from './lib/encryption';
import { useAppStore } from './store/store';
import { initAddonSystem } from './lib/addonManager';
import { loadFileStructure, readFileContent, saveFileContent } from './lib/fileSystem';
import { saveVersion } from './lib/versionHistory';
import { Layout, Model, TabNode, IJsonModel, Actions, DockLocation, Action } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import clsx from 'clsx';
import "./App.css";

// Wrapper to handle individual file loading/saving logic
const FileTabContent = ({ path }: { path: string }) => {
  const { fileContents, setFileContent, setUnsaved, encryptedNotes, setEncryptedNote } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEncryptModal, setShowEncryptModal] = useState(false);
  const [encryptMode, setEncryptMode] = useState<'encrypt' | 'decrypt'>('decrypt');

  useEffect(() => {
    if (fileContents[path] === undefined && !loading && !error) {
      setLoading(true);
      readFileContent(path).then((content) => {
        setFileContent(path, content);
        // Check if content is encrypted and track it
        if (isEncryptedContent(content)) {
          setEncryptedNote(path, { path, isLocked: true });
        }
        setLoading(false);
      }).catch((e) => {
        console.error(e);
        setError(e.message || 'Failed to load file');
        setLoading(false);
      });
    }
  }, [path, fileContents, setFileContent, loading, setEncryptedNote, error]);

  const handleEditorChange = (newContent: string) => {
    if (fileContents[path] !== newContent) {
      setFileContent(path, newContent);
      setUnsaved(path, true);
    }
  };

  const handleEncryptDecrypt = () => {
    const content = fileContents[path];
    if (isEncryptedContent(content)) {
      setEncryptMode('decrypt');
    } else {
      setEncryptMode('encrypt');
    }
    setShowEncryptModal(true);
  };

  const handleEncryptResult = (result: string, wasEncrypted: boolean) => {
    setFileContent(path, result);
    setUnsaved(path, true);
    setEncryptedNote(path, { path, isLocked: wasEncrypted });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Failed to load file</h3>
        <p className="text-sm text-gray-500 max-w-xs">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(false); }}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (fileContents[path] === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Loading {path.split(/[/\\]/).pop()}...</span>
      </div>
    );
  }

  const content = fileContents[path];
  const isEncrypted = isEncryptedContent(content);
  const noteInfo = encryptedNotes[path];

  // Show lock screen for encrypted notes
  if (isEncrypted && noteInfo?.isLocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">This note is encrypted</h3>
        <p className="text-sm text-gray-500 max-w-xs">Enter your password to unlock and view the contents of this note.</p>
        <button
          onClick={() => { setEncryptMode('decrypt'); setShowEncryptModal(true); }}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
          Unlock Note
        </button>
        <EncryptedNoteModal
          isOpen={showEncryptModal}
          onClose={() => setShowEncryptModal(false)}
          mode={encryptMode}
          content={content}
          onResult={handleEncryptResult}
        />
      </div>
    );
  }

  // Render file type specific views
  if (path.endsWith('.excalidraw')) {
    return <ExcalidrawEmbed dataString={content} onChange={handleEditorChange} />;
  }
  if (path.endsWith('.mermaid')) {
    return <MermaidEmbed definition={content} onChange={handleEditorChange} />;
  }
  if (path.endsWith('.kanban')) {
    return <KanbanEmbed dataString={content} onChange={handleEditorChange} />;
  }
  if (path.endsWith('.sheet')) {
    return <SpreadsheetEmbed dataString={content} onChange={handleEditorChange} />;
  }
  if (path.toLowerCase().endsWith('.pdf')) {
    return <PDFEmbed dataString={content} />;
  }
  if (path.toLowerCase().endsWith('.csv')) {
    return <CSVEmbed dataString={content} onChange={handleEditorChange} />;
  }
  if (path.toLowerCase().endsWith('.html') || path.toLowerCase().endsWith('.htm')) {
    return <HTMLEmbed dataString={content} onChange={handleEditorChange} />;
  }
  if (path.match(/\.(js|ts|tsx|py|json|css|xml|yaml|yml)$/)) {
    return <MonacoEmbed code={content} language={path.split('.').pop()} onChange={handleEditorChange} />;
  }

  // For markdown files, show encryption button
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
      <div className="shrink-0 flex items-center justify-end gap-2 px-4 py-1.5 border-b border-gray-200 dark:border-gray-700 text-xs">
        {noteInfo && !noteInfo.isLocked && <EncryptedBadge isLocked={false} />}
        <button
          onClick={handleEncryptDecrypt}
          className="px-2 py-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-1 transition-colors"
          title={isEncrypted ? 'Lock note' : 'Encrypt note'}
        >
          {isEncrypted ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Lock
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              Encrypt
            </>
          )}
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <Editor content={content} onChange={handleEditorChange} />
      </div>
      <EncryptedNoteModal
        isOpen={showEncryptModal}
        onClose={() => setShowEncryptModal(false)}
        mode={encryptMode}
        content={content}
        onResult={handleEncryptResult}
      />
    </div>
  );
};

const defaultLayout: IJsonModel = {
  global: {
    tabEnableClose: true,
    tabEnableDrag: true,
    tabSetEnableDrag: true,
    tabSetEnableDrop: true,
    tabSetEnableDivide: true,
    tabSetEnableTabStrip: true,
    tabSetEnableMaximize: true,
    borderEnableDrop: true,
    enableEdgeDock: true,
  },
  borders: [],
  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "tabset",
        weight: 100,
        enableDrop: true,
        enableDrag: true,
        enableDivide: true,
        enableTabStrip: true,
        children: []  // Start empty, vault manager will show on top
      }
    ]
  }
};

function App() {
  const { 
    theme, 
    currentPath, 
    setFileStructure, 
    activeFile, 
    setActiveFile, 
    unsavedChanges,
    fileContents,
    setUnsaved,
    setCurrentPath,
    setFileContent,
    autosaveEnabled,
    autosaveInterval,
    versionHistoryEnabled,
    maxVersionsPerFile,
    copilotDisplayMode
  } = useAppStore();

  // Vault state - always start with vault manager visible
  const [showVaultManager, setShowVaultManager] = useState(true);
  const [versionHistoryFile, setVersionHistoryFile] = useState<string | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const vaultRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Open vault handler
  interface Vault {
    path: string;
  }

  const handleOpenVault = async (vault: Vault): Promise<void> => {
    const ok = await window.electronAPI?.vault?.setCurrent?.(vault.path);
    if (!ok) {
      alert('This vault is not approved. Please add it again.');
      return;
    }
    setCurrentPath(vault.path);
    window.localStorage.setItem('lastVaultPath', vault.path);
    setShowVaultManager(false);
  };

  const [model, setModel] = useState<Model>(Model.fromJson(defaultLayout));
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);


  // Show vault manager if no vault is open (but also show on startup regardless)
  useEffect(() => {
    // Auto-open last vault if one was saved
    const lastVault = window.localStorage.getItem('lastVaultPath');
    if (lastVault && !currentPath) {
      // Try to reopen the last vault automatically
      window.electronAPI?.vault?.setCurrent?.(lastVault).then((ok: boolean) => {
        if (ok) {
          setCurrentPath(lastVault);
          setShowVaultManager(false);
        }
      });
    }
  }, [currentPath, setCurrentPath]);

  // Load file structure when vault is set
  useEffect(() => {
    let unsubscribeFileChanged: (() => void) | undefined;
    
    if (currentPath) {
      loadFileStructure(currentPath).then(setFileStructure).catch(console.error);
      
      // Start watching the vault for file changes
      window.electronAPI?.vault?.startWatching(currentPath);
      
      // Set up listener for file changes (store unsubscribe function)
      unsubscribeFileChanged = window.electronAPI?.vault?.onFileChanged((data) => {
        // Debounce the refresh to avoid too many updates
        console.log('Vault file changed:', data.filename);
        // Refresh file structure after a short delay
        if (vaultRefreshTimerRef.current) {
          clearTimeout(vaultRefreshTimerRef.current);
        }
        vaultRefreshTimerRef.current = setTimeout(() => {
          loadFileStructure(currentPath).then(setFileStructure).catch(console.error);
        }, 200);
      });
    }
    
    return () => {
      // Unsubscribe from file change listener
      unsubscribeFileChanged?.();
      // Stop watching when vault changes or component unmounts
      window.electronAPI?.vault?.stopWatching();
      if (vaultRefreshTimerRef.current) {
        clearTimeout(vaultRefreshTimerRef.current);
        vaultRefreshTimerRef.current = null;
      }
    };
  }, [currentPath, setFileStructure]);

  // Initialize addon system (plugins and themes)
  useEffect(() => {
    const init = async () => {
      try {
        await initAddonSystem();
        console.log('Addon system initialized');
      } catch (e) {
        console.error('Failed to initialize addon system:', e);
      }
    };
    init();
    
    // Cleanup: stop file watchers when app unmounts
    return () => {
      window.electronAPI?.addons?.stopWatching?.();
    };
  }, []);

  // Handle Global Save
  const handleSave = useCallback(async (isAutosave = false) => {
    for (const path of unsavedChanges) {
      if (fileContents[path] !== undefined) {
        try {
          await saveFileContent(path, fileContents[path]);
          setUnsaved(path, false);
          
          // Save version history (only if enabled and not too frequent for autosave)
          if (versionHistoryEnabled && currentPath) {
            await saveVersion(currentPath, path, fileContents[path], maxVersionsPerFile);
          }
          
          console.log(isAutosave ? 'Autosaved' : 'Saved', path);
        } catch (e) {
          console.error('Failed to save', path, e);
        }
      }
    }
  }, [unsavedChanges, fileContents, setUnsaved, versionHistoryEnabled, currentPath, maxVersionsPerFile]);

  // Apply theme to CSS variables and body class
  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark' || theme === 'obsidian';
    const palette = isDark
      ? {
          background: '#171717', // neutral-900
          foreground: '#f5f5f5', // neutral-100
          panel: '#262626', // neutral-800
          border: '#404040', // neutral-700
          accent: '#7c3aed',
          muted: '#a3a3a3', // neutral-400
        }
      : {
          background: '#ffffff',
          foreground: '#171717',
          panel: '#f5f5f5',
          border: '#e5e5e5',
          accent: '#2563eb',
          muted: '#737373',
        };

    root.style.setProperty('--background', palette.background);
    root.style.setProperty('--foreground', palette.foreground);
    root.style.setProperty('--panel', palette.panel);
    root.style.setProperty('--border', palette.border);
    root.style.setProperty('--accent', palette.accent);
    root.style.setProperty('--muted', palette.muted);

    const rootEl = document.documentElement;

    // Sync classes on both body and html for Tailwind dark variants
    document.body.classList.remove('light', 'dark', 'obsidian');
    rootEl.classList.remove('light', 'dark', 'obsidian');

    document.body.classList.add(theme);
    rootEl.classList.add(theme);

    // Add 'dark' class for Tailwind when using dark themes
    if (theme === 'dark' || theme === 'obsidian') {
      document.body.classList.add('dark');
      rootEl.classList.add('dark');
    }
  }, [theme]);

  // Autosave effect
  useEffect(() => {
    if (autosaveEnabled && unsavedChanges.size > 0) {
      // Clear existing timer
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      
      // Set new timer
      autosaveTimerRef.current = setTimeout(() => {
        handleSave(true);
      }, autosaveInterval * 1000);
    }
    
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [autosaveEnabled, autosaveInterval, unsavedChanges, handleSave]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        setIsQuickSwitcherOpen(true);
      }
      // Keyboard shortcuts help - Cmd+? or Cmd+Shift+/
      if ((e.ctrlKey || e.metaKey) && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    const saveHandler = () => handleSave();
    window.addEventListener('app-save', saveHandler);
    
    // Listen for menu actions from Electron menu (store unsubscribe functions)
    const unsubscribeMenuAction = window.electronAPI.onMenuAction((action: string) => {
      switch (action) {
        case 'save':
          handleSave();
          break;
        case 'quick-switcher':
          setIsQuickSwitcherOpen(true);
          break;
        case 'graph':
          window.dispatchEvent(new CustomEvent('app-open-graph'));
          break;
        case 'search':
          setIsSearchOpen(true);
          break;
        case 'open-folder':
          window.dispatchEvent(new CustomEvent('app-open-folder'));
          break;
        case 'version-history':
          if (activeFile) {
            setVersionHistoryFile(activeFile);
          }
          break;
        case 'close-tab':
          window.dispatchEvent(new CustomEvent('app-close-current-tab'));
          break;
      }
    });
    
    // Listen for format actions from Electron menu
    const unsubscribeFormatAction = window.electronAPI.onFormatAction((action: string) => {
      window.dispatchEvent(new CustomEvent('editor-format', { detail: { action } }));
    });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('app-save', saveHandler);
      unsubscribeMenuAction();
      unsubscribeFormatAction();
    };
  }, [handleSave, activeFile]);

  // Event Listeners for Sidebar
  useEffect(() => {
    const openGraph = () => {
      const activeTabset = model.getActiveTabset();
      const fallbackParent = model.getRoot().getChildren()[0]?.getId();
      const parentId = activeTabset ? activeTabset.getId() : fallbackParent;

      if (!parentId) return;

      try {
        const existing = model.getNodeById('graph-view');
        if (existing) {
          model.doAction(Actions.selectTab('graph-view'));
        } else {
          model.doAction(Actions.addNode({
            type: 'tab',
            component: 'graph',
            name: 'Graph View',
            id: 'graph-view',
            enableClose: true,
            enableDrag: true,
            enableRename: false,
          }, parentId, DockLocation.RIGHT, -1));
        }
      } catch (e) {
        if (parentId) {
          model.doAction(Actions.addNode({
              type: 'tab',
              component: 'graph',
              name: 'Graph View',
              id: 'graph-view',
              enableDrag: true,
              enableRename: false,
          }, parentId, DockLocation.RIGHT, -1));
        }
      }
    };

    const toggleSearch = () => setIsSearchOpen(true);

    const openToRight = (e: Event) => {
      if (!(e instanceof CustomEvent)) return;
      const evt = e as CustomEvent<{ path: string }>;
      const filePath = evt.detail.path;
      
      // Find the active tabset and add to the right
      const activeTabset = model.getActiveTabset();
      if (activeTabset) {
        model.doAction(Actions.addNode({
          type: 'tab',
          component: 'file',
          name: filePath.split('/').pop() || filePath,
          id: filePath,
          enableDrag: true,
          enableRename: false,
        }, activeTabset.getId(), DockLocation.RIGHT, -1));
      }
    };

    const handleCloseFile = (e: Event) => {
      if (!(e instanceof CustomEvent)) return;
      const evt = e as CustomEvent<{ path: string }>;
      const filePath = evt.detail.path;
      const node = model.getNodeById(filePath);
      if (node) {
        try {
          model.doAction(Actions.deleteTab(node.getId()));
        } catch (err) {
          console.error('Failed to close tab for deleted file', err);
        }
      }
      // Also update store to keep it in sync
      useAppStore.getState().closeFile(filePath);
    };

    window.addEventListener('app-open-graph', openGraph);
    window.addEventListener('app-toggle-search', toggleSearch);
    window.addEventListener('app-open-to-right', openToRight);
    window.addEventListener('app-close-file', handleCloseFile);
    
    // Open AI Copilot - check display mode preference
    const openCopilot = () => {
      if (copilotDisplayMode === 'popup') {
        window.electronAPI.openCopilotWindow();
      } else {
        // Open in split view (as a tab to the right)
        const activeTabset = model.getActiveTabset();
        const fallbackParent = model.getRoot().getChildren()[0]?.getId();
        const parentId = activeTabset ? activeTabset.getId() : fallbackParent;
        if (!parentId) return;
        
        try {
          const existing = model.getNodeById('copilot-panel');
          if (existing) {
            model.doAction(Actions.selectTab('copilot-panel'));
          } else {
            model.doAction(Actions.addNode({
              type: 'tab',
              component: 'copilot',
              name: 'AI Copilot',
              id: 'copilot-panel',
              enableClose: true,
              enableDrag: true,
              enableRename: false,
            }, parentId, DockLocation.RIGHT, -1));
          }
        } catch (e) {
          if (parentId) {
            model.doAction(Actions.addNode({
              type: 'tab',
              component: 'copilot',
              name: 'AI Copilot',
              id: 'copilot-panel',
              enableDrag: true,
              enableRename: false,
            }, parentId, DockLocation.RIGHT, -1));
          }
        }
      }
    };
    window.addEventListener('app-open-copilot', openCopilot);
    
    const openVersionHistory = (e: Event) => {
      if (!(e instanceof CustomEvent)) return;
      const evt = e as CustomEvent<{ path: string }>;
      setVersionHistoryFile(evt.detail.path);
    };
    window.addEventListener('app-open-version-history', openVersionHistory);
    
    // Helper function to open a panel
    const openPanel = (id: string, name: string, component: string) => {
      const activeTabset = model.getActiveTabset();
      const fallbackParent = model.getRoot().getChildren()[0]?.getId();
      const parentId = activeTabset ? activeTabset.getId() : fallbackParent;

      if (!parentId) return;

      try {
        const existing = model.getNodeById(id);
        if (existing) {
          model.doAction(Actions.selectTab(id));
        } else {
          model.doAction(Actions.addNode({
            type: 'tab',
            component,
            name,
            id,
            enableClose: true,
            enableDrag: true,
            enableRename: false,
          }, parentId, DockLocation.CENTER, -1));
        }
      } catch (e) {
        if (parentId) {
          model.doAction(Actions.addNode({
            type: 'tab',
            component,
            name,
            id,
            enableDrag: true,
            enableRename: false,
          }, parentId, DockLocation.CENTER, -1));
        }
      }
    };
    
    const openTasks = () => openPanel('tasks-panel', 'Tasks', 'tasks');
    const openCalendar = () => openPanel('calendar-panel', 'Calendar', 'calendar');
    const openInsights = () => openPanel('insights-panel', 'Insights', 'insights');
    const openCommandPalette = () => window.dispatchEvent(new CustomEvent('open-command-palette'));
    const openHomepage = () => openPanel('homepage-panel', 'Home', 'homepage');
    const openWhiteboard = () => openPanel('whiteboard-panel', 'Whiteboard', 'whiteboard');
    const openDiagram = () => openPanel('diagram-panel', 'Diagram', 'diagram');
    const openCloudSync = () => openPanel('cloudsync-panel', 'Cloud Sync', 'cloudsync');
    const openScratchPad = () => openPanel('scratchpad-panel', 'Scratch Pad', 'scratchpad');
    const openStickies = () => openPanel('stickies-panel', 'All Stickies', 'stickies');
    const openFocusMode = () => setShowFocusMode(true);
    const openQuickNote = () => setShowQuickNote(true);
    const openAbout = () => setShowAbout(true);
    const openSettings = () => setShowSettings(true);
    
    // Handle whiteboard save to vault
    const handleWhiteboardSave = async (e: Event) => {
      if (!(e instanceof CustomEvent)) return;
      const evt = e as CustomEvent<{ fileName: string; content: string }>;
      if (!currentPath) {
        alert('Please open a vault first to save whiteboards');
        return;
      }
      const { fileName, content } = evt.detail;
      const filePath = `${currentPath}/${fileName}`;
      try {
        await saveFileContent(filePath, content);
        // Refresh file structure
        loadFileStructure(currentPath).then(setFileStructure);
        console.log('Whiteboard saved to:', filePath);
      } catch (err) {
        console.error('Failed to save whiteboard:', err);
        alert('Failed to save whiteboard');
      }
    };
    
    // Handle diagram save to vault
    const handleDiagramSave = async (e: Event) => {
      if (!(e instanceof CustomEvent)) return;
      const evt = e as CustomEvent<{ fileName: string; content: string }>;
      if (!currentPath) {
        alert('Please open a vault first to save diagrams');
        return;
      }
      const { fileName, content } = evt.detail;
      const filePath = `${currentPath}/${fileName}`;
      try {
        await saveFileContent(filePath, content);
        // Refresh file structure
        loadFileStructure(currentPath).then(setFileStructure);
        console.log('Diagram saved to:', filePath);
      } catch (err) {
        console.error('Failed to save diagram:', err);
        alert('Failed to save diagram');
      }
    };
    
    // Handle refresh files event
    const handleRefreshFiles = () => {
      if (currentPath) {
        loadFileStructure(currentPath).then(setFileStructure);
      }
    };
    
    // Handle close current tab (Cmd+W)
    const handleCloseCurrentTab = () => {
      const activeTabset = model.getActiveTabset();
      if (activeTabset) {
        const selectedNode = activeTabset.getSelectedNode();
        if (selectedNode) {
          const nodeId = selectedNode.getId();
          try {
            model.doAction(Actions.deleteTab(nodeId));
            // Note: onAction handler will also handle closeFile for file tabs
          } catch (err) {
            console.error('Failed to close tab', err);
          }
        }
      }
    };
    
    window.addEventListener('app-open-tasks', openTasks);
    window.addEventListener('app-open-calendar', openCalendar);
    window.addEventListener('app-open-insights', openInsights);
    window.addEventListener('app-open-command-palette', openCommandPalette);
    window.addEventListener('app-open-homepage', openHomepage);
    window.addEventListener('app-open-whiteboard', openWhiteboard);
    window.addEventListener('app-open-diagram', openDiagram);
    window.addEventListener('app-open-cloudsync', openCloudSync);
    window.addEventListener('app-open-scratchpad', openScratchPad);
    window.addEventListener('app-open-stickies', openStickies);
    window.addEventListener('app-open-focus-mode', openFocusMode);
    window.addEventListener('app-open-quicknote', openQuickNote);
    window.addEventListener('app-open-about', openAbout);
    window.addEventListener('app-open-settings', openSettings);
    window.addEventListener('whiteboard-save', handleWhiteboardSave);
    window.addEventListener('diagram-save', handleDiagramSave);
    window.addEventListener('app-refresh-files', handleRefreshFiles);
    window.addEventListener('app-close-current-tab', handleCloseCurrentTab);
    
    return () => {
      window.removeEventListener('app-open-graph', openGraph);
      window.removeEventListener('app-toggle-search', toggleSearch);
      window.removeEventListener('app-open-to-right', openToRight);
      window.removeEventListener('app-close-file', handleCloseFile);
      window.removeEventListener('app-open-copilot', openCopilot);
      window.removeEventListener('app-open-version-history', openVersionHistory);
      window.removeEventListener('app-open-tasks', openTasks);
      window.removeEventListener('app-open-calendar', openCalendar);
      window.removeEventListener('app-open-insights', openInsights);
      window.removeEventListener('app-open-command-palette', openCommandPalette);
      window.removeEventListener('app-open-homepage', openHomepage);
      window.removeEventListener('app-open-whiteboard', openWhiteboard);
      window.removeEventListener('app-open-diagram', openDiagram);
      window.removeEventListener('app-open-cloudsync', openCloudSync);
      window.removeEventListener('app-open-scratchpad', openScratchPad);
      window.removeEventListener('app-open-stickies', openStickies);
      window.removeEventListener('app-open-focus-mode', openFocusMode);
      window.removeEventListener('app-open-quicknote', openQuickNote);
      window.removeEventListener('app-open-about', openAbout);
      window.removeEventListener('app-open-settings', openSettings);
      window.removeEventListener('whiteboard-save', handleWhiteboardSave);
      window.removeEventListener('diagram-save', handleDiagramSave);
      window.removeEventListener('app-refresh-files', handleRefreshFiles);
      window.removeEventListener('app-close-current-tab', handleCloseCurrentTab);
    };
  }, [model, currentPath, setFileStructure, activeFile, setActiveFile]);

  // Sync activeFile from Explorer to Layout
  useEffect(() => {
    if (activeFile) {
      const nodeId = activeFile;
      const node = model.getNodeById(nodeId);
      
      if (node) {
        if (node.getType() === 'tab' && !(node as TabNode).isVisible()) {
             model.doAction(Actions.selectTab(nodeId));
        }
      } else {
        const activeTabset = model.getActiveTabset();
        const parentId = activeTabset ? activeTabset.getId() : (model.getRoot().getChildren()[0]?.getId() || '');

        if (!parentId) return;
        
        model.doAction(Actions.addNode({
          type: 'tab',
          component: 'file',
          name: activeFile.split('/').pop() || activeFile,
          id: nodeId,
          enableDrag: true,
          enableRename: false,
          config: { path: activeFile }
        }, parentId, DockLocation.CENTER, -1));
      }
    }
  }, [activeFile, model]);

  const factory = (node: TabNode) => {
    const component = node.getComponent();
    if (component === 'welcome' || component === 'homepage') {
      return (
        <Homepage 
          onOpenFile={(path) => setActiveFile(path)}
          onOpenPanel={(panel) => {
            switch(panel) {
              case 'tasks':
                window.dispatchEvent(new CustomEvent('app-open-tasks'));
                break;
              case 'calendar':
                window.dispatchEvent(new CustomEvent('app-open-calendar'));
                break;
              case 'insights':
                window.dispatchEvent(new CustomEvent('app-open-insights'));
                break;
              case 'graph':
                window.dispatchEvent(new CustomEvent('app-open-graph'));
                break;
              case 'copilot':
                window.dispatchEvent(new CustomEvent('app-open-copilot'));
                break;
              case 'about':
                setShowAbout(true);
                break;
            }
          }}
          onSearch={() => setIsSearchOpen(true)}
          onCommandPalette={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
        />
      );
    }
    if (component === 'graph') {
      return <GraphView onNodeClick={(path) => setActiveFile(path)} />;
    }
    if (component === 'copilot') {
      return <CopilotPanel />;
    }
    if (component === 'tasks') {
      return <TaskPanel />;
    }
    if (component === 'calendar') {
      return <CalendarPanel />;
    }
    if (component === 'insights') {
      return <InsightsPanel />;
    }
    if (component === 'cloudsync') {
      return <CloudSyncPanel />;
    }
    if (component === 'whiteboard') {
      const data = node.getConfig()?.data || '';
      return (
        <Whiteboard 
          dataString={data} 
          onChange={(newData) => {
            // Store whiteboard data in node config
            node.getModel().doAction(Actions.updateNodeAttributes(node.getId(), { config: { data: newData } }));
          }}
        />
      );
    }
    if (component === 'scratchpad') {
      return <ScratchPad />;
    }
    if (component === 'stickies') {
      return <StickiesOverview />;
    }
    if (component === 'copilot') {
      return <CopilotPanel />;
    }
    if (component === 'diagram') {
      const data = node.getConfig()?.data || '';
      return (
        <DiagramMaker 
          dataString={data} 
          onChange={(newData) => {
            node.getModel().doAction(Actions.updateNodeAttributes(node.getId(), { config: { data: newData } }));
          }}
        />
      );
    }
    if (component === 'file') {
      const path = node.getConfig()?.path || node.getId();
      return <FileTabContent path={path} />;
    }
    return <div className="p-4 text-gray-500 dark:text-gray-400">Unknown component: {component}</div>;
  };

  const onModelChange = (updatedModel: Model) => {
    setModel(updatedModel);
  };

  // Handle FlexLayout actions to sync active file when tabs are clicked
  const onAction = (action: Action): Action | undefined => {
    // When a tab is selected, update the active file in the store
    if (action.type === Actions.SELECT_TAB) {
      const nodeId = action.data?.tabNode;
      if (nodeId) {
        const node = model.getNodeById(nodeId);
        if (node && node.getType() === 'tab') {
          const tabNode = node as TabNode;
          const component = tabNode.getComponent();
          // Only set activeFile for file tabs
          if (component === 'file') {
            const path = tabNode.getConfig()?.path || tabNode.getId();
            if (path && path !== activeFile) {
              setActiveFile(path);
              useAppStore.getState().openFile(path);
            }
          } else {
            // Clear activeFile for non-file tabs
            if (activeFile !== null) {
              setActiveFile(null);
            }
          }
        }
      }
    }
    // When a tab is deleted, handle cleanup
    if (action.type === Actions.DELETE_TAB) {
      const nodeId = action.data?.node;
      if (nodeId) {
        const node = model.getNodeById(nodeId);
        if (node && node.getType() === 'tab') {
          const tabNode = node as TabNode;
          const component = tabNode.getComponent();
          if (component === 'file') {
            const path = tabNode.getConfig()?.path || tabNode.getId();
            useAppStore.getState().closeFile(path);
          }
        }
      }
    }
    return action;
  };

  // Resizing Logic (Sidebar/Explorer) - Sidebar is now fixed width
  const [explorerWidth, setExplorerWidth] = useState(200);
  const [resizingTarget, setResizingTarget] = useState<'explorer' | null>(null);

  const startResizingExplorer = useCallback(() => setResizingTarget('explorer'), []);
  const stopResizing = useCallback(() => setResizingTarget(null), []);

  const resize = useCallback((e: MouseEvent) => {
    if (resizingTarget === 'explorer') {
      const sidebarWidth = 64;
      setExplorerWidth(Math.max(100, Math.min(800, e.clientX - sidebarWidth)));
    }
  }, [resizingTarget]);

  useEffect(() => {
    if (resizingTarget) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resizingTarget, resize, stopResizing]);

  // Calculate positions for absolute layout
  const sidebarWidth = 64;
  const explorerLeft = sidebarWidth;
  const mainLeft = sidebarWidth + explorerWidth;

  if (showVaultManager) {
    return <VaultManager onOpenVault={handleOpenVault} />;
  }

  return (
    <CommandPaletteProvider>
      <AutoLockProvider>
        <div
          className={clsx(
            "app-container",
            theme,
            (theme === 'dark' || theme === 'obsidian') && 'dark',
            // Ensure base text/bg are always set even if custom CSS fails
            "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          )}
        >
          {/* Sidebar - Fixed width, not resizable */}
          <div 
            className="app-sidebar bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-100"
            style={{ width: sidebarWidth }}
          >
            <Sidebar />
          </div>

          {/* Explorer */}
          <div 
            className="app-explorer bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100"
            style={{ left: explorerLeft, width: explorerWidth }}
          >
            <FileExplorer />
            <div 
              className="resize-handle resize-handle-explorer" 
              onMouseDown={startResizingExplorer} 
            />
          </div>
          
          {/* Main Content (FlexLayout) */}
          <div 
            className="app-main bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            style={{ left: mainLeft }}
          >
            <Layout
              model={model}
              factory={factory}
              onModelChange={onModelChange}
              onAction={onAction}
              onRenderTabSet={(node, renderValues) => {
                // Add split buttons to tabset header
                renderValues.buttons.push(
                  <button 
                    key="split-h" 
                    className="flexlayout__tab_toolbar_button"
                    title="Split Right"
                    onClick={() => {
                      const activeTab = node.getSelectedNode();
                      if (activeTab) {
                        model.doAction(Actions.addNode({
                          type: 'tab',
                          component: 'welcome',
                          name: 'New Tab',
                          enableDrag: true,
                        }, node.getId(), DockLocation.RIGHT, -1));
                      }
                    }}
                  >
                    ⇥
                  </button>,
                  <button 
                    key="split-v" 
                    className="flexlayout__tab_toolbar_button"
                    title="Split Down"
                    onClick={() => {
                      const activeTab = node.getSelectedNode();
                      if (activeTab) {
                        model.doAction(Actions.addNode({
                          type: 'tab',
                          component: 'welcome',
                          name: 'New Tab',
                          enableDrag: true,
                        }, node.getId(), DockLocation.BOTTOM, -1));
                      }
                    }}
                  >
                    ⇩
                  </button>
                );
              }}
              classNameMapper={(className) => {
                if (theme === 'dark' || theme === 'obsidian') {
                  if (className === 'flexlayout__tab_button') return 'flexlayout__tab_button flexlayout__tab_button--dark';
                  if (className === 'flexlayout__tab_toolbar_button') return 'flexlayout__tab_toolbar_button flexlayout__tab_toolbar_button--dark';
                }
                return className;
              }}
            />
          </div>

          <SearchModal 
            isOpen={isSearchOpen} 
            onClose={() => setIsSearchOpen(false)} 
            onOpenFile={(path) => setActiveFile(path)} 
          />

          <QuickSwitcher
            isOpen={isQuickSwitcherOpen}
            onClose={() => setIsQuickSwitcherOpen(false)}
            onOpenFile={(path) => setActiveFile(path)}
          />

          {versionHistoryFile && (
            <VersionHistoryModal
              isOpen={!!versionHistoryFile}
              onClose={() => setVersionHistoryFile(null)}
              filePath={versionHistoryFile}
              onRestore={(content) => {
                setFileContent(versionHistoryFile, content);
                setUnsaved(versionHistoryFile, true);
              }}
            />
          )}

          <AboutModal 
            isOpen={showAbout} 
            onClose={() => setShowAbout(false)} 
          />

          <SettingsModal 
            isOpen={showSettings} 
            onClose={() => setShowSettings(false)} 
          />

          <FocusMode 
            isOpen={showFocusMode} 
            onClose={() => setShowFocusMode(false)} 
          />

          <FloatingQuickNote 
            isOpen={showQuickNote} 
            onClose={() => setShowQuickNote(false)} 
          />

          <KeyboardShortcuts 
            isOpen={showKeyboardShortcuts} 
            onClose={() => setShowKeyboardShortcuts(false)} 
          />

          {/* Persistent floating stickies */}
          <PersistentStickies />
        </div>
      </AutoLockProvider>
    </CommandPaletteProvider>
  );
}

export default App;

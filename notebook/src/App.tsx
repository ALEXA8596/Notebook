import { useEffect, useCallback, useRef, useState } from 'react';
import { VaultManager } from './components/modals/VaultManager';
import { Sidebar } from './components/layout/Sidebar';
import { FileExplorer } from './components/navigation/FileExplorer';
import { Editor } from './components/editor/Editor';
import { ExcalidrawEmbed } from './components/embeds/ExcalidrawEmbed';
import { MermaidEmbed } from './components/embeds/MermaidEmbed';
import { MonacoEmbed } from './components/embeds/MonacoEmbed';
import { KanbanEmbed } from './components/embeds/KanbanEmbed';
import { SpreadsheetEmbed } from './components/embeds/SpreadsheetEmbed';
import { PDFEmbed } from './components/embeds/PDFEmbed';
import { CSVEmbed } from './components/embeds/CSVEmbed';
import { HTMLEmbed } from './components/embeds/HTMLEmbed';
import { GraphView } from './components/features/GraphView';
import { SearchModal } from './components/modals/SearchModal';
import { QuickSwitcher } from './components/navigation/QuickSwitcher';
import { Homepage } from './components/layout/Homepage';
import { TaskPanel } from './components/panels/TaskPanel';
import { CalendarPanel } from './components/panels/CalendarPanel';
import { InsightsPanel } from './components/panels/InsightsPanel';
import { Whiteboard } from './components/features/Whiteboard';
import { DiagramMaker } from './components/features/DiagramMaker';
import { FocusMode } from './components/features/FocusMode';
import { ScratchPad } from './components/features/ScratchPad';
import { CopilotPanel } from './components/panels/CopilotPanel';
import { CommandPalette } from './components/navigation/CommandPalette';
import { CloudSyncPanel } from './components/panels/CloudSyncPanel';
import { AboutModal } from './components/modals/AboutModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { useAppStore } from './store/store';
import { loadFileStructure, readFileContent, saveFileContent } from './lib/fileSystem';
import { Layout, Model, TabNode, IJsonModel, Actions, DockLocation } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import clsx from 'clsx';
import "./App.css";

// Wrapper to handle individual file loading/saving logic
const FileTabContent = ({ path }: { path: string }) => {
  const { fileContents, setFileContent, setUnsaved } = useAppStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (fileContents[path] === undefined && !loading) {
      setLoading(true);
      readFileContent(path).then((content) => {
        setFileContent(path, content);
        setLoading(false);
      }).catch((e) => {
        console.error(e);
        setLoading(false);
      });
    }
  }, [path, fileContents, setFileContent, loading]);

  const handleEditorChange = (newContent: string) => {
    if (fileContents[path] !== newContent) {
      setFileContent(path, newContent);
      setUnsaved(path, true);
    }
  };

  if (fileContents[path] === undefined) {
    return <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>;
  }

  const content = fileContents[path];

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

  return <Editor content={content} onChange={handleEditorChange} />;
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
        children: [
          {
            type: "tab",
            name: "Welcome",
            component: "welcome",
            enableDrag: true,
          }
        ]
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
    autosaveEnabled,
    autosaveInterval
  } = useAppStore();

  // Vault state
  const [showVaultManager, setShowVaultManager] = useState(() => !window.localStorage.getItem('lastVaultPath'));

  // Open vault handler
  interface Vault {
    path: string;
  }

  const handleOpenVault = (vault: Vault): void => {
    setCurrentPath(vault.path);
    window.localStorage.setItem('lastVaultPath', vault.path);
    setShowVaultManager(false);
  };

  const [model, setModel] = useState<Model>(Model.fromJson(defaultLayout));
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);


  // Show vault manager if no vault is open
  useEffect(() => {
    if (!currentPath) {
      const last = window.localStorage.getItem('lastVaultPath');
      if (!last) setShowVaultManager(true);
    }
  }, [currentPath]);

  // Load file structure when vault is set
  useEffect(() => {
    if (currentPath) {
      loadFileStructure(currentPath).then(setFileStructure).catch(console.error);
    }
  }, [currentPath, setFileStructure]);

  // Handle Global Save
  const handleSave = useCallback(async () => {
    for (const path of unsavedChanges) {
      if (fileContents[path] !== undefined) {
        try {
          await saveFileContent(path, fileContents[path]);
          setUnsaved(path, false);
          console.log('Saved', path);
        } catch (e) {
          console.error('Failed to save', path, e);
        }
      }
    }
  }, [unsavedChanges, fileContents, setUnsaved]);

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
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('app-save', handleSave);
    
    // Listen for menu actions from Electron menu
    window.electronAPI.onMenuAction((action: string) => {
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
      }
    });
    
    // Listen for format actions from Electron menu
    window.electronAPI.onFormatAction((action: string) => {
      window.dispatchEvent(new CustomEvent('editor-format', { detail: { action } }));
    });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('app-save', handleSave);
    };
  }, [handleSave]);

  // Autosave timer - skips saving while focused on an embed
  useEffect(() => {
    if (!autosaveEnabled || autosaveInterval <= 0) return;

    // Helper to check if focus is currently in an embed component
    const isInEmbed = (): boolean => {
      const active = document.activeElement;
      if (!active) return false;

      // Check if active element or any ancestor matches embed selectors
      const embedSelectors = [
        '.monaco-editor',           // Monaco editor (code blocks, standalone files)
        '.excalidraw',              // Excalidraw canvas
        '.excalidraw-container',    // Excalidraw wrapper
        '.cm-codeblock-widget',     // Live preview code blocks
        '[data-embed]',             // Generic embed marker
      ];

      for (const selector of embedSelectors) {
        if (active.closest(selector)) return true;
      }

      // Also check for iframes and canvas elements (many embeds use these)
      if (active.tagName === 'IFRAME' || active.tagName === 'CANVAS') return true;
      if (active.closest('iframe') || active.closest('canvas')) return true;

      return false;
    };

    const intervalId = setInterval(() => {
      // Skip autosave if currently editing in an embed
      if (isInEmbed()) {
        console.log('Autosave skipped: user is in an embed');
        return;
      }

      // Only save if there are unsaved changes
      if (unsavedChanges.size > 0) {
        console.log('Autosaving...');
        handleSave();
      }
    }, autosaveInterval * 1000);

    return () => clearInterval(intervalId);
  }, [autosaveEnabled, autosaveInterval, unsavedChanges.size, handleSave]);

  // Actions
  const openTab = useCallback((component: string, name: string, id: string, location: DockLocation = DockLocation.CENTER) => {
    const activeTabset = model.getActiveTabset();
    const fallbackParent = model.getRoot().getChildren()[0]?.getId();
    // Prefer active tabset, otherwise fallback to root's first child
    const parentId = activeTabset ? activeTabset.getId() : fallbackParent;

    if (!parentId) return;

    try {
      const existing = model.getNodeById(id);
      if (existing) {
        model.doAction(Actions.selectTab(id));
      } else {
        model.doAction(Actions.addNode({
          type: 'tab',
          component: component,
          name: name,
          id: id,
          enableClose: true,
          enableDrag: true,
          enableRename: false,
        }, parentId, location, -1));
      }
    } catch (e) {
      console.error("Failed to open tab", e);
    }
  }, [model]);

  const openGraph = useCallback(() => openTab('graph', 'Graph View', 'graph-view', DockLocation.RIGHT), [openTab]);
  const openHomepage = useCallback(() => openTab('homepage', 'Home', 'homepage', DockLocation.CENTER), [openTab]);
  const openTasks = useCallback(() => openTab('tasks', 'Tasks', 'tasks-panel', DockLocation.RIGHT), [openTab]);
  const openCalendar = useCallback(() => openTab('calendar', 'Calendar', 'calendar-panel', DockLocation.RIGHT), [openTab]);
  const openInsights = useCallback(() => openTab('insights', 'Insights', 'insights-panel', DockLocation.RIGHT), [openTab]);
  const openWhiteboard = useCallback(() => openTab('whiteboard', 'Whiteboard', 'whiteboard-panel', DockLocation.CENTER), [openTab]);
  const openDiagram = useCallback(() => openTab('diagram', 'Diagram', 'diagram-panel', DockLocation.CENTER), [openTab]);
  const openCopilot = useCallback(() => openTab('copilot', 'Copilot', 'copilot-panel', DockLocation.RIGHT), [openTab]);
  const openCloudSync = useCallback(() => openTab('cloud', 'Cloud Sync', 'cloud-sync-panel', DockLocation.RIGHT), [openTab]);
  const openScratchPad = useCallback(() => openTab('scratchpad', 'ScratchPad', 'scratchpad-panel', DockLocation.RIGHT), [openTab]);

  const toggleSearch = useCallback(() => setIsSearchOpen(true), []);
  const toggleCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
  const toggleFocusMode = useCallback(() => setIsFocusModeOpen(true), []);
  const toggleAbout = useCallback(() => setIsAboutOpen(true), []);
  const toggleSettings = useCallback(() => setIsSettingsOpen(true), []);

  // Event Listeners for Sidebar
  useEffect(() => {
    const openToRight = (e: CustomEvent<{ path: string }>) => {
      const filePath = e.detail.path;
      const fileName = filePath.split('\\').pop() || filePath;
      
      // Find the active tabset and add to the right
      const activeTabset = model.getActiveTabset();
      if (activeTabset) {
        model.doAction(Actions.addNode({
          type: 'tab',
          component: 'file',
          name: fileName,
          id: filePath,
          enableDrag: true,
          enableRename: false,
        }, activeTabset.getId(), DockLocation.RIGHT, -1));
      }
    };

    window.addEventListener('app-open-graph', openGraph);
    window.addEventListener('app-toggle-search', toggleSearch);
    window.addEventListener('app-open-to-right', openToRight as EventListener);
    window.addEventListener('app-open-homepage', openHomepage);
    window.addEventListener('app-open-tasks', openTasks);
    window.addEventListener('app-open-calendar', openCalendar);
    window.addEventListener('app-open-insights', openInsights);
    window.addEventListener('app-open-whiteboard', openWhiteboard);
    window.addEventListener('app-open-diagram', openDiagram);
    window.addEventListener('app-open-copilot', openCopilot);
    window.addEventListener('app-open-cloudsync', openCloudSync);
    window.addEventListener('app-open-stickies', openScratchPad);
    window.addEventListener('app-open-quicknote', openScratchPad);
    window.addEventListener('app-open-command-palette', toggleCommandPalette);
    window.addEventListener('app-open-focus-mode', toggleFocusMode);
    window.addEventListener('app-open-about', toggleAbout);
    window.addEventListener('app-open-settings', toggleSettings);

    return () => {
      window.removeEventListener('app-open-graph', openGraph);
      window.removeEventListener('app-toggle-search', toggleSearch);
      window.removeEventListener('app-open-to-right', openToRight as EventListener);
      window.removeEventListener('app-open-homepage', openHomepage);
      window.removeEventListener('app-open-tasks', openTasks);
      window.removeEventListener('app-open-calendar', openCalendar);
      window.removeEventListener('app-open-insights', openInsights);
      window.removeEventListener('app-open-whiteboard', openWhiteboard);
      window.removeEventListener('app-open-diagram', openDiagram);
      window.removeEventListener('app-open-copilot', openCopilot);
      window.removeEventListener('app-open-cloudsync', openCloudSync);
      window.removeEventListener('app-open-stickies', openScratchPad);
      window.removeEventListener('app-open-quicknote', openScratchPad);
      window.removeEventListener('app-open-command-palette', toggleCommandPalette);
      window.removeEventListener('app-open-focus-mode', toggleFocusMode);
      window.removeEventListener('app-open-about', toggleAbout);
      window.removeEventListener('app-open-settings', toggleSettings);
    };
  }, [
    model, openGraph, openHomepage, openTasks, openCalendar, openInsights, 
    openWhiteboard, openDiagram, openCopilot, openCloudSync, openScratchPad,
    toggleSearch, toggleCommandPalette, toggleFocusMode, toggleAbout, toggleSettings
  ]);

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
          name: activeFile.split('\\').pop() || activeFile,
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
    if (component === 'welcome') {
      return (
        <div className="p-6 h-full bg-white dark:bg-gray-900 overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Welcome to Notebook</h2>
          <p className="text-gray-600 dark:text-gray-400">Open a file from the explorer to get started.</p>
          <p className="text-gray-500 dark:text-gray-500 mt-2 text-sm">Try dragging this tab to split the view!</p>
          <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-4">
            <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">Quick Start</h3>
            <ul className="list-disc ml-5 space-y-1 text-gray-600 dark:text-gray-400">
              <li>Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 text-xs text-gray-800 dark:text-gray-300 font-mono">Ctrl+P</kbd> to search files</li>
              <li>Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 text-xs text-gray-800 dark:text-gray-300 font-mono">Ctrl+K</kbd> for commands</li>
              <li>Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 text-xs text-gray-800 dark:text-gray-300 font-mono">Ctrl+S</kbd> to save</li>
            </ul>
          </div>
        </div>
      );
    }
    if (component === 'graph') return <GraphView onNodeClick={(path) => setActiveFile(path)} />;
    if (component === 'homepage') {
      return (
        <Homepage 
          onOpenFile={(path) => setActiveFile(path)}
          onSearch={() => setIsSearchOpen(true)}
          onCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenPanel={(panelId) => {
            if (panelId === 'tasks') openTasks();
            else if (panelId === 'calendar') openCalendar();
            else if (panelId === 'insights') openInsights();
            else if (panelId === 'whiteboard') openWhiteboard();
          }}
        />
      );
    }
    if (component === 'tasks') return <TaskPanel />;
    if (component === 'calendar') return <CalendarPanel />;
    if (component === 'insights') return <InsightsPanel />;
    if (component === 'whiteboard') return <Whiteboard />;
    if (component === 'diagram') return <DiagramMaker />;
    if (component === 'copilot') return <CopilotPanel />;
    if (component === 'cloud') return <CloudSyncPanel />;
    if (component === 'scratchpad') return <ScratchPad />;
    
    if (component === 'file') {
      const path = node.getConfig()?.path || node.getId();
      return <FileTabContent path={path} />;
    }
    return <div className="p-4 text-gray-500 dark:text-gray-400">Unknown component: {component}</div>;
  };

  const onModelChange = (updatedModel: Model) => {
    setModel(updatedModel);
  };

  // Resizing Logic (Sidebar/Explorer)
  const [sidebarWidth, setSidebarWidth] = useState(64);
  const [explorerWidth, setExplorerWidth] = useState(200);
  const explorerLastWidthRef = useRef(200);
  const [resizingTarget, setResizingTarget] = useState<'sidebar' | 'explorer' | null>(null);

  const startResizingSidebar = useCallback(() => setResizingTarget('sidebar'), []);
  const startResizingExplorer = useCallback(() => setResizingTarget('explorer'), []);
  const stopResizing = useCallback(() => setResizingTarget(null), []);
  const toggleExplorer = useCallback(() => {
    setExplorerWidth((prev) => {
      if (prev <= 0) {
        return Math.max(140, explorerLastWidthRef.current || 200);
      }
      explorerLastWidthRef.current = prev;
      return 0;
    });
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (resizingTarget === 'sidebar') {
      setSidebarWidth(Math.max(50, Math.min(300, e.clientX)));
    } else if (resizingTarget === 'explorer') {
      setExplorerWidth(Math.max(140, Math.min(800, e.clientX - sidebarWidth)));
    }
  }, [resizingTarget, sidebarWidth]);

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

  useEffect(() => {
    if (explorerWidth > 0) {
      explorerLastWidthRef.current = explorerWidth;
    }
  }, [explorerWidth]);

  useEffect(() => {
    window.addEventListener('app-toggle-explorer', toggleExplorer as EventListener);
    return () => {
      window.removeEventListener('app-toggle-explorer', toggleExplorer as EventListener);
    };
  }, [toggleExplorer]);

  // Calculate positions for absolute layout
  const explorerLeft = sidebarWidth;
  const mainLeft = sidebarWidth + explorerWidth;

  if (showVaultManager) {
    return <VaultManager onOpenVault={handleOpenVault} />;
  }

  return (
    <div className={clsx("app-container", theme)}>
      {/* Sidebar */}
      <div 
        className="app-sidebar"
        style={{ width: sidebarWidth }}
      >
        <Sidebar />
        <div 
          className="resize-handle resize-handle-sidebar" 
          onMouseDown={startResizingSidebar} 
        />
      </div>

      {/* Explorer */}
      <div 
        className="app-explorer"
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
        className="app-main"
        style={{ left: mainLeft }}
      >
        <Layout
          model={model}
          factory={factory}
          onModelChange={onModelChange}
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

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      <FocusMode
        isOpen={isFocusModeOpen}
        onClose={() => setIsFocusModeOpen(false)}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
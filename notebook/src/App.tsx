import { useEffect, useCallback, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { FileExplorer } from './components/FileExplorer';
import { Editor } from './components/editor/Editor';
import { ExcalidrawEmbed } from './components/embeds/ExcalidrawEmbed';
import { MermaidEmbed } from './components/embeds/MermaidEmbed';
import { MonacoEmbed } from './components/embeds/MonacoEmbed';
import { KanbanEmbed } from './components/embeds/KanbanEmbed';
import { SpreadsheetEmbed } from './components/embeds/SpreadsheetEmbed';
import { PDFEmbed } from './components/embeds/PDFEmbed';
import { GraphView } from './components/GraphView';
import { SearchModal } from './components/SearchModal';
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
  if (path.match(/\.(js|ts|tsx|py|json|css|html)$/)) {
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
    setUnsaved
  } = useAppStore();

  const [model, setModel] = useState<Model>(Model.fromJson(defaultLayout));
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Load file structure
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
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('app-save', handleSave);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('app-save', handleSave);
    };
  }, [handleSave]);

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

    window.addEventListener('app-open-graph', openGraph);
    window.addEventListener('app-toggle-search', toggleSearch);
    return () => {
      window.removeEventListener('app-open-graph', openGraph);
      window.removeEventListener('app-toggle-search', toggleSearch);
    };
  }, [model]);

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
        <div className="p-6 h-full">
          <h2 className="text-xl font-semibold mb-4">Welcome to Notebook</h2>
          <p className="text-gray-600 dark:text-gray-400">Open a file from the explorer to get started.</p>
          <p className="text-gray-500 dark:text-gray-500 mt-2 text-sm">Try dragging this tab to split the view!</p>
        </div>
      );
    }
    if (component === 'graph') {
      return <GraphView onNodeClick={(path) => setActiveFile(path)} />;
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

  // Resizing Logic (Sidebar/Explorer)
  const [sidebarWidth, setSidebarWidth] = useState(64);
  const [explorerWidth, setExplorerWidth] = useState(200);
  const [resizingTarget, setResizingTarget] = useState<'sidebar' | 'explorer' | null>(null);

  const startResizingSidebar = useCallback(() => setResizingTarget('sidebar'), []);
  const startResizingExplorer = useCallback(() => setResizingTarget('explorer'), []);
  const stopResizing = useCallback(() => setResizingTarget(null), []);

  const resize = useCallback((e: MouseEvent) => {
    if (resizingTarget === 'sidebar') {
      setSidebarWidth(Math.max(50, Math.min(300, e.clientX)));
    } else if (resizingTarget === 'explorer') {
      setExplorerWidth(Math.max(100, Math.min(800, e.clientX - sidebarWidth)));
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

  // Calculate positions for absolute layout
  const explorerLeft = sidebarWidth;
  const mainLeft = sidebarWidth + explorerWidth;

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
    </div>
  );
}

export default App;
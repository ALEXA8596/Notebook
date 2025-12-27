import { useEffect, useCallback, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { FileExplorer } from './components/FileExplorer';
import { Editor } from './components/editor/Editor';
import { ExcalidrawEmbed } from './components/embeds/ExcalidrawEmbed';
import { useAppStore } from './store/store';
import { loadFileStructure, readFileContent, saveFileContent } from './lib/fileSystem';
import { X } from 'lucide-react';
import clsx from 'clsx';
import "./App.css";

function App() {
  const { 
    theme, 
    currentPath, 
    setFileStructure, 
    activeFile, 
    openFiles, 
    setActiveFile, 
    closeFile,
    fileContents,
    setFileContent,
    setUnsaved,
    unsavedChanges
  } = useAppStore();

  // Load file structure when path changes
  useEffect(() => {
    if (currentPath) {
      loadFileStructure(currentPath).then(setFileStructure).catch(console.error);
    }
  }, [currentPath, setFileStructure]);

  // Load file content when active file changes
  useEffect(() => {
    if (activeFile && fileContents[activeFile] === undefined) {
      readFileContent(activeFile).then((content) => {
        setFileContent(activeFile, content);
      }).catch(console.error);
    }
  }, [activeFile, fileContents, setFileContent]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (activeFile && unsavedChanges.has(activeFile)) {
      try {
        await saveFileContent(activeFile, fileContents[activeFile]);
        setUnsaved(activeFile, false);
        console.log('Saved', activeFile);
      } catch (e) {
        console.error('Failed to save', e);
      }
    }
  }, [activeFile, unsavedChanges, fileContents, setUnsaved]);

  // Global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('app-save', handleSave); // Listen for custom event from Sidebar
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('app-save', handleSave);
    };
  }, [handleSave]);

  const [sidebarWidth, setSidebarWidth] = useState(64);
  const [explorerWidth, setExplorerWidth] = useState(200);
  const [resizingTarget, setResizingTarget] = useState<'sidebar' | 'explorer' | null>(null);

  const startResizingSidebar = useCallback(() => {
    setResizingTarget('sidebar');
  }, []);

  const startResizingExplorer = useCallback(() => {
    setResizingTarget('explorer');
  }, []);

  const stopResizing = useCallback(() => {
    setResizingTarget(null);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      const windowWidth = window.innerWidth;
      
      if (resizingTarget === 'sidebar') {
        // Limit sidebar to 300px or 30% of screen
        const maxWidth = Math.min(300, windowWidth * 0.3);
        setSidebarWidth(Math.min(Math.max(50, mouseMoveEvent.clientX), maxWidth));
      } else if (resizingTarget === 'explorer') {
        // Limit explorer so that main content has at least 300px
        const minContentWidth = 300;
        const maxExplorerWidth = windowWidth - sidebarWidth - minContentWidth;
        
        // Also set a hard max for explorer if desired
        const absoluteMax = 800;
        const effectiveMax = Math.max(100, Math.min(maxExplorerWidth, absoluteMax));
        
        const newWidth = mouseMoveEvent.clientX - sidebarWidth;
        setExplorerWidth(Math.min(Math.max(100, newWidth), effectiveMax));
      }
    },
    [resizingTarget, sidebarWidth]
  );

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

  const handleEditorChange = (newContent: string) => {
    if (activeFile) {
      setFileContent(activeFile, newContent);
      setUnsaved(activeFile, true);
    }
  };

  return (
    <div className={clsx("flex h-screen w-screen overflow-hidden text-sm", theme)}>
      <div className="flex w-full h-full bg-background text-foreground">
        {/* Sidebar (Icon Bar) */}
        <div style={{ width: sidebarWidth }} className="flex h-full shrink-0 relative">
          <Sidebar />
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors z-10"
            onMouseDown={startResizingSidebar}
          />
        </div>

        {/* File Explorer */}
        <div style={{ width: explorerWidth }} className="flex h-full shrink-0 relative bg-gray-50 dark:bg-[#252526]">
          <FileExplorer />
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 transition-colors z-10"
            onMouseDown={startResizingExplorer}
          />
        </div>
        
        <div className="flex-grow flex flex-col h-full overflow-hidden bg-white dark:bg-[#1e1e1e]">
          {/* Tabs */}
          <div className="flex bg-gray-100 dark:bg-[#252526] overflow-x-auto border-b border-gray-200 dark:border-gray-800">
            {openFiles.map((path) => {
              const fileName = path.split('\\').pop() || path;
              const isActive = path === activeFile;
              const isUnsaved = unsavedChanges.has(path);

              return (
                <div 
                  key={path}
                  className={clsx(
                    "flex items-center px-3 py-2 cursor-pointer border-r border-gray-200 dark:border-gray-800 min-w-[120px] max-w-[200px] group",
                    isActive ? "bg-white dark:bg-[#1e1e1e]" : "bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#333]"
                  )}
                  onClick={() => setActiveFile(path)}
                >
                  <span className="truncate flex-grow">{fileName}</span>
                  {isUnsaved && <span className="w-2 h-2 rounded-full bg-yellow-500 ml-2" />}
                  <button 
                    className="ml-2 opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-gray-600 rounded p-0.5"
                    onClick={(e) => { e.stopPropagation(); closeFile(path); }}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Editor Area */}
          <div className="flex-grow overflow-hidden relative">
            {activeFile ? (
              fileContents[activeFile] !== undefined ? (
                activeFile.endsWith('.excalidraw') ? (
                  <div className="w-full h-full">
                    <ExcalidrawEmbed 
                      key={activeFile}
                      dataString={fileContents[activeFile]} 
                      onChange={handleEditorChange} 
                    />
                  </div>
                ) : (
                  <Editor 
                    key={activeFile} // Force remount on file switch to reset editor state
                    content={fileContents[activeFile]} 
                    onChange={handleEditorChange} 
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
              )
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a file to view
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
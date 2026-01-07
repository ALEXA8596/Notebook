import React, { useState } from 'react';
import { Code, Eye, Columns, ExternalLink, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

interface HTMLEmbedProps {
  dataString: string;
  onChange: (newData: string) => void;
}

type ViewMode = 'split' | 'code' | 'preview';

export const HTMLEmbed: React.FC<HTMLEmbedProps> = ({ dataString, onChange }) => {
  const [code, setCode] = useState(dataString || '');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleBlur = () => {
    if (code !== dataString) {
      onChange(code);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onChange(code);
      setTimeout(() => {
        window.dispatchEvent(new Event('app-save'));
      }, 100);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  // Create a safe sandbox for rendering HTML
  const createSrcDoc = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              margin: 0; 
              padding: 16px; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
          </style>
        </head>
        <body>
          ${code}
        </body>
      </html>
    `;
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900" onKeyDown={handleKeyDown}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <button
          className={clsx(
            "p-1.5 rounded text-sm flex items-center gap-1",
            viewMode === 'code' ? "bg-blue-500 text-white" : "hover:bg-gray-200 dark:hover:bg-gray-700"
          )}
          onClick={() => setViewMode('code')}
          title="Code Only"
        >
          <Code size={14} />
        </button>
        <button
          className={clsx(
            "p-1.5 rounded text-sm flex items-center gap-1",
            viewMode === 'split' ? "bg-blue-500 text-white" : "hover:bg-gray-200 dark:hover:bg-gray-700"
          )}
          onClick={() => setViewMode('split')}
          title="Split View"
        >
          <Columns size={14} />
        </button>
        <button
          className={clsx(
            "p-1.5 rounded text-sm flex items-center gap-1",
            viewMode === 'preview' ? "bg-blue-500 text-white" : "hover:bg-gray-200 dark:hover:bg-gray-700"
          )}
          onClick={() => setViewMode('preview')}
          title="Preview Only"
        >
          <Eye size={14} />
        </button>
        
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
        
        <button
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          onClick={handleRefresh}
          title="Refresh Preview"
        >
          <RefreshCw size={14} />
        </button>
        
        <span className="ml-2 text-xs text-gray-500">HTML Preview</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor */}
        {(viewMode === 'code' || viewMode === 'split') && (
          <div className={clsx("flex flex-col", viewMode === 'split' ? "w-1/2 border-r border-gray-200 dark:border-gray-700" : "w-full")}>
            <textarea
              className="flex-1 w-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none outline-none"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onBlur={handleBlur}
              placeholder="Enter HTML code..."
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={clsx("overflow-hidden", viewMode === 'split' ? "w-1/2" : "w-full")}>
            <iframe
              key={refreshKey}
              srcDoc={createSrcDoc()}
              className="w-full h-full border-0 bg-white"
              title="HTML Preview"
              sandbox="allow-scripts"
            />
          </div>
        )}
      </div>
    </div>
  );
};

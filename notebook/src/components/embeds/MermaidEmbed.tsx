import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { Code, Eye, Columns, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import clsx from 'clsx';

interface MermaidEmbedProps {
  definition: string;
  onChange?: (newDefinition: string) => void;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

type ViewMode = 'split' | 'code' | 'preview';

export const MermaidEmbed: React.FC<MermaidEmbedProps> = ({ definition, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState(definition || '');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [zoom, setZoom] = useState(100);
  const isFocusedRef = useRef(false);

  // Render diagram when code changes
  useEffect(() => {
    const renderDiagram = async () => {
      if (!code) {
        setSvg('');
        return;
      }
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        setSvg(svg);
        setError(null);
      } catch (e) {
        console.error("Mermaid render error", e);
        setError("Failed to render diagram. Check syntax.");
      }
    };

    const timeout = setTimeout(renderDiagram, 300);
    return () => clearTimeout(timeout);
  }, [code]);

  // Save on blur
  const handleBlur = useCallback(() => {
    if (onChange && code !== definition) {
      onChange(code);
    }
    isFocusedRef.current = false;
  }, [code, definition, onChange]);

  // Handle Ctrl+S
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (onChange) {
        onChange(code);
      }
      setTimeout(() => {
        window.dispatchEvent(new Event('app-save'));
      }, 100);
    }
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
          onClick={() => setZoom(z => Math.max(25, z - 25))}
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[3rem] text-center">
          {zoom}%
        </span>
        <button
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          onClick={() => setZoom(z => Math.min(400, z + 25))}
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <button
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          onClick={() => setZoom(100)}
          title="Reset Zoom"
        >
          <RotateCcw size={14} />
        </button>
        
        <span className="ml-2 text-xs text-gray-500">Mermaid Diagram</span>
        {error && <span className="ml-auto text-xs text-red-500">{error}</span>}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor */}
        {(viewMode === 'code' || viewMode === 'split') && (
          <div className={clsx("flex flex-col", viewMode === 'split' ? "w-1/2 border-r border-gray-200 dark:border-gray-700" : "w-full")}>
            <textarea
              ref={textareaRef}
              className="flex-1 w-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 resize-none outline-none"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onBlur={handleBlur}
              onFocus={() => { isFocusedRef.current = true; }}
              placeholder="Enter Mermaid diagram code..."
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={clsx("overflow-auto p-4 flex items-center justify-center bg-white dark:bg-gray-900", viewMode === 'split' ? "w-1/2" : "w-full")}>
            {error ? (
              <div className="text-red-500 text-sm">{error}</div>
            ) : svg ? (
              <div 
                ref={containerRef}
                dangerouslySetInnerHTML={{ __html: svg }} 
                className="max-w-full max-h-full transition-transform"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
              />
            ) : (
              <div className="text-gray-400 text-sm">Enter Mermaid code to see preview</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

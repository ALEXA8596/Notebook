import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pencil, Eraser, Square, Circle, Minus, Type, Undo, Redo,
  Trash2, Download, Save, ZoomIn, ZoomOut, Move, Palette,
  MousePointer, Grid3X3, Layers
} from 'lucide-react';
import clsx from 'clsx';

interface WhiteboardProps {
  dataString?: string;
  onChange?: (data: string) => void;
  readOnly?: boolean;
}

type Tool = 'select' | 'pencil' | 'eraser' | 'rectangle' | 'ellipse' | 'line' | 'text' | 'pan';

interface Point {
  x: number;
  y: number;
}

interface DrawElement {
  id: string;
  type: 'path' | 'rectangle' | 'ellipse' | 'line' | 'text';
  points?: Point[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  fill?: string;
}

interface WhiteboardState {
  elements: DrawElement[];
  backgroundColor: string;
  showGrid: boolean;
}

const colors = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', 
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'
];

const strokeWidths = [1, 2, 4, 8, 12];

export const Whiteboard: React.FC<WhiteboardProps> = ({ dataString, onChange, readOnly = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<DrawElement[]>([]);
  const [currentElement, setCurrentElement] = useState<DrawElement | null>(null);
  const [history, setHistory] = useState<DrawElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Load initial data
  useEffect(() => {
    if (dataString) {
      try {
        const data: WhiteboardState = JSON.parse(dataString);
        setElements(data.elements || []);
        setBackgroundColor(data.backgroundColor || '#ffffff');
        setShowGrid(data.showGrid ?? true);
        setHistory([data.elements || []]);
        setHistoryIndex(0);
      } catch (e) {
        console.error('Failed to parse whiteboard data', e);
      }
    }
  }, []);
  
  // Save data
  const saveData = useCallback(() => {
    const data: WhiteboardState = {
      elements,
      backgroundColor,
      showGrid,
    };
    onChange?.(JSON.stringify(data));
  }, [elements, backgroundColor, showGrid, onChange]);
  
  // Auto-save on changes
  useEffect(() => {
    const timeout = setTimeout(saveData, 500);
    return () => clearTimeout(timeout);
  }, [elements, backgroundColor, showGrid, saveData]);
  
  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
    
    // Clear and fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;
      const gridSize = 20 * zoom;
      
      for (let x = (pan.x % gridSize); x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = (pan.y % gridSize); y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }
    
    // Apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    // Draw elements
    const drawElement = (el: DrawElement) => {
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.fill || 'transparent';
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      switch (el.type) {
        case 'path':
          if (el.points && el.points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(el.points[0].x, el.points[0].y);
            for (let i = 1; i < el.points.length; i++) {
              ctx.lineTo(el.points[i].x, el.points[i].y);
            }
            ctx.stroke();
          }
          break;
        case 'rectangle':
          if (el.x !== undefined && el.y !== undefined && el.width && el.height) {
            ctx.beginPath();
            ctx.rect(el.x, el.y, el.width, el.height);
            if (el.fill && el.fill !== 'transparent') {
              ctx.fill();
            }
            ctx.stroke();
          }
          break;
        case 'ellipse':
          if (el.x !== undefined && el.y !== undefined && el.width && el.height) {
            ctx.beginPath();
            ctx.ellipse(
              el.x + el.width / 2,
              el.y + el.height / 2,
              Math.abs(el.width / 2),
              Math.abs(el.height / 2),
              0, 0, Math.PI * 2
            );
            if (el.fill && el.fill !== 'transparent') {
              ctx.fill();
            }
            ctx.stroke();
          }
          break;
        case 'line':
          if (el.points && el.points.length === 2) {
            ctx.beginPath();
            ctx.moveTo(el.points[0].x, el.points[0].y);
            ctx.lineTo(el.points[1].x, el.points[1].y);
            ctx.stroke();
          }
          break;
        case 'text':
          if (el.x !== undefined && el.y !== undefined && el.text) {
            ctx.font = `${el.strokeWidth * 8}px sans-serif`;
            ctx.fillStyle = el.color;
            ctx.fillText(el.text, el.x, el.y);
          }
          break;
      }
    };
    
    elements.forEach(drawElement);
    if (currentElement) drawElement(currentElement);
    
    ctx.restore();
  }, [elements, currentElement, zoom, pan, showGrid, backgroundColor]);
  
  // Get canvas coordinates
  const getCanvasPoint = (e: React.MouseEvent | MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  };
  
  // Selected element for selection tool
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  
  // Find element at point for selection
  const findElementAtPoint = (point: Point): DrawElement | null => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === 'path' && el.points) {
        for (const p of el.points) {
          if (Math.abs(p.x - point.x) < 10 && Math.abs(p.y - point.y) < 10) {
            return el;
          }
        }
      } else if ((el.type === 'rectangle' || el.type === 'ellipse') && 
                 el.x !== undefined && el.y !== undefined && el.width && el.height) {
        if (point.x >= el.x && point.x <= el.x + el.width &&
            point.y >= el.y && point.y <= el.y + el.height) {
          return el;
        }
      } else if (el.type === 'text' && el.x !== undefined && el.y !== undefined) {
        if (point.x >= el.x && point.x <= el.x + 100 &&
            point.y >= el.y - 20 && point.y <= el.y + 10) {
          return el;
        }
      }
    }
    return null;
  };
  
  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;
    
    const point = getCanvasPoint(e);
    
    // Handle select tool
    if (tool === 'select') {
      const element = findElementAtPoint(point);
      if (element) {
        setSelectedElementId(element.id);
        setDragOffset({
          x: point.x - (element.x || element.points?.[0]?.x || 0),
          y: point.y - (element.y || element.points?.[0]?.y || 0)
        });
        setIsDrawing(true);
      } else {
        setSelectedElementId(null);
      }
      return;
    }
    
    // Handle text tool
    if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        const newElement: DrawElement = {
          id: Date.now().toString(),
          type: 'text',
          x: point.x,
          y: point.y,
          text: text,
          color: color,
          strokeWidth: strokeWidth,
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newElements);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
      return;
    }
    
    setIsDrawing(true);
    
    if (tool === 'pan') {
      return;
    }
    
    const newElement: DrawElement = {
      id: Date.now().toString(),
      type: tool === 'pencil' || tool === 'eraser' ? 'path' : 
            tool === 'rectangle' ? 'rectangle' :
            tool === 'ellipse' ? 'ellipse' :
            tool === 'line' ? 'line' : 'path',
      points: tool === 'pencil' || tool === 'eraser' || tool === 'line' ? [point] : undefined,
      x: tool === 'rectangle' || tool === 'ellipse' ? point.x : undefined,
      y: tool === 'rectangle' || tool === 'ellipse' ? point.y : undefined,
      width: 0,
      height: 0,
      color: tool === 'eraser' ? backgroundColor : color,
      strokeWidth: tool === 'eraser' ? strokeWidth * 5 : strokeWidth,
    };
    
    setCurrentElement(newElement);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || readOnly) return;
    
    const point = getCanvasPoint(e);
    
    // Handle select tool dragging
    if (tool === 'select' && selectedElementId) {
      setElements(elements.map(el => {
        if (el.id !== selectedElementId) return el;
        if (el.type === 'path' && el.points) {
          const dx = point.x - dragOffset.x - el.points[0].x;
          const dy = point.y - dragOffset.y - el.points[0].y;
          return {
            ...el,
            points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
          };
        }
        return {
          ...el,
          x: point.x - dragOffset.x,
          y: point.y - dragOffset.y,
        };
      }));
      return;
    }
    
    if (tool === 'pan') {
      setPan(p => ({
        x: p.x + e.movementX,
        y: p.y + e.movementY,
      }));
      return;
    }
    
    if (!currentElement) return;
    
    if (currentElement.type === 'path') {
      setCurrentElement({
        ...currentElement,
        points: [...(currentElement.points || []), point],
      });
    } else if (currentElement.type === 'rectangle' || currentElement.type === 'ellipse') {
      setCurrentElement({
        ...currentElement,
        width: point.x - (currentElement.x || 0),
        height: point.y - (currentElement.y || 0),
      });
    } else if (currentElement.type === 'line') {
      setCurrentElement({
        ...currentElement,
        points: [currentElement.points![0], point],
      });
    }
  };
  
  const handleMouseUp = () => {
    // Handle select tool - save changes to history after drag
    if (tool === 'select' && isDrawing && selectedElementId) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push([...elements]);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setIsDrawing(false);
      return;
    }
    
    if (isDrawing && currentElement) {
      const newElements = [...elements, currentElement];
      setElements(newElements);
      
      // Update history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newElements);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
    setIsDrawing(false);
    setCurrentElement(null);
  };
  
  // Undo/Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  };
  
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  };
  
  // Clear canvas
  const handleClear = () => {
    setElements([]);
    setSelectedElementId(null);
    const newHistory = [...history, []];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  
  // Delete selected element
  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    const newElements = elements.filter(el => el.id !== selectedElementId);
    setElements(newElements);
    setSelectedElementId(null);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  
  // Save to vault
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const handleSaveToVault = async () => {
    setSaveStatus('saving');
    const data: WhiteboardState = {
      elements,
      backgroundColor,
      showGrid,
    };
    const jsonData = JSON.stringify(data, null, 2);
    const fileName = `whiteboard-${Date.now()}.whiteboard`;
    
    // Dispatch event to save file
    window.dispatchEvent(new CustomEvent('whiteboard-save', { 
      detail: { fileName, content: jsonData } 
    }));
    
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };
  
  // Export as image
  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      // Delete selected element
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        e.preventDefault();
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, selectedElementId, elements]);
  
  const toolButtons: { tool: Tool; icon: React.ElementType; label: string }[] = [
    { tool: 'select', icon: MousePointer, label: 'Select & Move' },
    { tool: 'pencil', icon: Pencil, label: 'Pencil' },
    { tool: 'eraser', icon: Eraser, label: 'Eraser' },
    { tool: 'line', icon: Minus, label: 'Line' },
    { tool: 'rectangle', icon: Square, label: 'Rectangle' },
    { tool: 'ellipse', icon: Circle, label: 'Ellipse' },
    { tool: 'text', icon: Type, label: 'Text' },
    { tool: 'pan', icon: Move, label: 'Pan' },
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 flex-wrap">
        {/* Tools */}
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {toolButtons.map(btn => (
            <button
              key={btn.tool}
              onClick={() => setTool(btn.tool)}
              className={clsx(
                "p-1.5 rounded transition-colors",
                tool === btn.tool
                  ? "bg-white dark:bg-gray-700 shadow-sm"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
              title={btn.label}
            >
              <btn.icon size={18} />
            </button>
          ))}
        </div>
        
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        
        {/* Color picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1"
          >
            <div 
              className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: color }}
            />
            <Palette size={14} />
          </button>
          
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
              <div className="grid grid-cols-5 gap-1">
                {colors.map(c => (
                  <button
                    key={c}
                    onClick={() => { setColor(c); setShowColorPicker(false); }}
                    className={clsx(
                      "w-6 h-6 rounded border-2 transition-transform hover:scale-110",
                      color === c ? "border-blue-500" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Stroke width */}
        <select
          value={strokeWidth}
          onChange={e => setStrokeWidth(Number(e.target.value))}
          className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent"
        >
          {strokeWidths.map(w => (
            <option key={w} value={w}>{w}px</option>
          ))}
        </select>
        
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        
        {/* Zoom */}
        <button
          onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(z => Math.min(4, z + 0.25))}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        
        {/* Grid toggle */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={clsx(
            "p-1.5 rounded",
            showGrid ? "bg-blue-100 dark:bg-blue-900 text-blue-600" : "hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
          title="Toggle Grid"
        >
          <Grid3X3 size={18} />
        </button>
        
        <div className="flex-1" />
        
        {/* Actions */}
        <button
          onClick={handleUndo}
          disabled={historyIndex === 0}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
          title="Undo (⌘Z)"
        >
          <Undo size={18} />
        </button>
        <button
          onClick={handleRedo}
          disabled={historyIndex === history.length - 1}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
          title="Redo (⌘⇧Z)"
        >
          <Redo size={18} />
        </button>
        <button
          onClick={handleClear}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-red-500"
          title="Clear All"
        >
          <Trash2 size={18} />
        </button>
        {selectedElementId && (
          <button
            onClick={handleDeleteSelected}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-orange-500"
            title="Delete Selected (Del)"
          >
            <Trash2 size={18} />
          </button>
        )}
        <button
          onClick={handleSaveToVault}
          disabled={saveStatus === 'saving'}
          className={clsx(
            "p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1",
            saveStatus === 'saved' ? "text-green-600" : "text-green-500"
          )}
          title="Save to Vault"
        >
          <Save size={18} />
          {saveStatus === 'saving' && <span className="text-xs">...</span>}
          {saveStatus === 'saved' && <span className="text-xs">✓</span>}
        </button>
        <button
          onClick={handleExport}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Export as PNG"
        >
          <Download size={18} />
        </button>
      </div>
      
      {/* Selected element indicator */}
      {selectedElementId && (
        <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-xs text-blue-600 dark:text-blue-400 border-b border-gray-200 dark:border-gray-700">
          Element selected - drag to move, press Delete to remove
        </div>
      )}
      
      {/* Canvas */}
      <div 
        ref={containerRef} 
        className="flex-1 overflow-hidden"
        onDragStart={(e) => e.preventDefault()}
        draggable={false}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDragStart={(e) => e.preventDefault()}
          draggable={false}
          className="w-full h-full"
          style={{ cursor: tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair' }}
        />
      </div>
    </div>
  );
};

export default Whiteboard;

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Square, Circle, Diamond, ArrowRight, Type, MousePointer, 
  Trash2, Save, Download, ZoomIn, ZoomOut, Undo, Redo,
  Layers, Grid3X3, Palette, Move, Minus, Plus, Copy, Clipboard,
  CornerDownRight, Database, FileText, Cloud, Server, User,
  Hexagon, Triangle, Star, MessageSquare
} from 'lucide-react';
import clsx from 'clsx';

interface DiagramMakerProps {
  dataString?: string;
  onChange?: (data: string) => void;
  readOnly?: boolean;
}

type ShapeType = 'rectangle' | 'ellipse' | 'diamond' | 'hexagon' | 'triangle' | 
                 'cylinder' | 'document' | 'cloud' | 'parallelogram' | 'star' |
                 'callout' | 'person';

type Tool = 'select' | 'rectangle' | 'ellipse' | 'diamond' | 'hexagon' | 'triangle' |
            'cylinder' | 'document' | 'cloud' | 'parallelogram' | 'star' | 'callout' | 
            'person' | 'line' | 'arrow' | 'text' | 'pan';

interface Point {
  x: number;
  y: number;
}

interface DiagramNode {
  id: string;
  type: ShapeType | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  fontSize: number;
}

interface DiagramConnection {
  id: string;
  type: 'line' | 'arrow' | 'bidirectional';
  fromNode: string;
  toNode: string;
  fromAnchor: 'top' | 'bottom' | 'left' | 'right' | 'center';
  toAnchor: 'top' | 'bottom' | 'left' | 'right' | 'center';
  strokeColor: string;
  strokeWidth: number;
  label?: string;
  points?: Point[]; // for curved/bent lines
}

interface DiagramState {
  nodes: DiagramNode[];
  connections: DiagramConnection[];
  backgroundColor: string;
  showGrid: boolean;
}

const shapeTemplates: { type: Tool; icon: React.ElementType; label: string; category: string }[] = [
  // Basic
  { type: 'select', icon: MousePointer, label: 'Select', category: 'Tools' },
  { type: 'pan', icon: Move, label: 'Pan', category: 'Tools' },
  { type: 'text', icon: Type, label: 'Text', category: 'Tools' },
  // Shapes
  { type: 'rectangle', icon: Square, label: 'Rectangle', category: 'Shapes' },
  { type: 'ellipse', icon: Circle, label: 'Ellipse', category: 'Shapes' },
  { type: 'diamond', icon: Diamond, label: 'Diamond', category: 'Shapes' },
  { type: 'hexagon', icon: Hexagon, label: 'Hexagon', category: 'Shapes' },
  { type: 'triangle', icon: Triangle, label: 'Triangle', category: 'Shapes' },
  { type: 'star', icon: Star, label: 'Star', category: 'Shapes' },
  // Flowchart
  { type: 'cylinder', icon: Database, label: 'Database', category: 'Flowchart' },
  { type: 'document', icon: FileText, label: 'Document', category: 'Flowchart' },
  { type: 'cloud', icon: Cloud, label: 'Cloud', category: 'Flowchart' },
  { type: 'person', icon: User, label: 'Person', category: 'Flowchart' },
  { type: 'callout', icon: MessageSquare, label: 'Callout', category: 'Flowchart' },
  // Connectors
  { type: 'line', icon: Minus, label: 'Line', category: 'Connectors' },
  { type: 'arrow', icon: ArrowRight, label: 'Arrow', category: 'Connectors' },
];

const colors = [
  '#ffffff', '#f8fafc', '#e2e8f0', '#94a3b8', '#64748b', '#1e293b', '#000000',
  '#fef2f2', '#fee2e2', '#fca5a5', '#ef4444', '#dc2626', '#b91c1c', '#7f1d1d',
  '#fff7ed', '#ffedd5', '#fdba74', '#f97316', '#ea580c', '#c2410c', '#9a3412',
  '#fefce8', '#fef9c3', '#fde047', '#eab308', '#ca8a04', '#a16207', '#854d0e',
  '#f0fdf4', '#dcfce7', '#86efac', '#22c55e', '#16a34a', '#15803d', '#166534',
  '#f0f9ff', '#e0f2fe', '#7dd3fc', '#0ea5e9', '#0284c7', '#0369a1', '#075985',
  '#faf5ff', '#f3e8ff', '#d8b4fe', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8',
  '#fdf4ff', '#fae8ff', '#f0abfc', '#d946ef', '#c026d3', '#a21caf', '#86198f',
];

export const DiagramMaker: React.FC<DiagramMakerProps> = ({ dataString, onChange, readOnly = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [tool, setTool] = useState<Tool>('select');
  const [nodes, setNodes] = useState<DiagramNode[]>([]);
  const [connections, setConnections] = useState<DiagramConnection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [history, setHistory] = useState<DiagramState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  
  const [fillColor, setFillColor] = useState('#ffffff');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  
  const [showFillPicker, setShowFillPicker] = useState(false);
  const [showStrokePicker, setShowStrokePicker] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  
  // Load initial data
  useEffect(() => {
    if (dataString) {
      try {
        const data: DiagramState = JSON.parse(dataString);
        setNodes(data.nodes || []);
        setConnections(data.connections || []);
        setBackgroundColor(data.backgroundColor || '#ffffff');
        setShowGrid(data.showGrid ?? true);
        setHistory([data]);
        setHistoryIndex(0);
      } catch (e) {
        console.error('Failed to parse diagram data', e);
      }
    }
  }, []);
  
  // Save data
  const saveData = useCallback(() => {
    const data: DiagramState = {
      nodes,
      connections,
      backgroundColor,
      showGrid,
    };
    onChange?.(JSON.stringify(data));
  }, [nodes, connections, backgroundColor, showGrid, onChange]);
  
  useEffect(() => {
    const timeout = setTimeout(saveData, 500);
    return () => clearTimeout(timeout);
  }, [nodes, connections, backgroundColor, showGrid, saveData]);
  
  // Save to vault
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const handleSaveToVault = () => {
    setSaveStatus('saving');
    const data: DiagramState = {
      nodes,
      connections,
      backgroundColor,
      showGrid,
    };
    const jsonData = JSON.stringify(data, null, 2);
    const fileName = `diagram-${Date.now()}.diagram`;
    
    window.dispatchEvent(new CustomEvent('diagram-save', { 
      detail: { fileName, content: jsonData } 
    }));
    
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };
  
  // Save to history
  const saveToHistory = useCallback(() => {
    const state: DiagramState = { nodes, connections, backgroundColor, showGrid };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [nodes, connections, backgroundColor, showGrid, history, historyIndex]);
  
  // Get canvas point
  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  };
  
  // Get node anchor point
  const getAnchorPoint = (node: DiagramNode, anchor: string): Point => {
    switch (anchor) {
      case 'top': return { x: node.x + node.width / 2, y: node.y };
      case 'bottom': return { x: node.x + node.width / 2, y: node.y + node.height };
      case 'left': return { x: node.x, y: node.y + node.height / 2 };
      case 'right': return { x: node.x + node.width, y: node.y + node.height / 2 };
      default: return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    }
  };
  
  // Find node at point
  const findNodeAtPoint = (point: Point): DiagramNode | null => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (point.x >= node.x && point.x <= node.x + node.width &&
          point.y >= node.y && point.y <= node.y + node.height) {
        return node;
      }
    }
    return null;
  };
  
  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
    
    // Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid
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
    
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    // Draw connections
    connections.forEach(conn => {
      const fromNode = nodes.find(n => n.id === conn.fromNode);
      const toNode = nodes.find(n => n.id === conn.toNode);
      if (!fromNode || !toNode) return;
      
      const from = getAnchorPoint(fromNode, conn.fromAnchor);
      const to = getAnchorPoint(toNode, conn.toAnchor);
      
      ctx.strokeStyle = conn.strokeColor;
      ctx.lineWidth = conn.strokeWidth;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      
      // Draw arrow if needed
      if (conn.type === 'arrow' || conn.type === 'bidirectional') {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const arrowLen = 12;
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - arrowLen * Math.cos(angle - Math.PI / 6), to.y - arrowLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - arrowLen * Math.cos(angle + Math.PI / 6), to.y - arrowLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
      
      // Selection highlight
      if (selectedConnectionId === conn.id) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = conn.strokeWidth + 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
    
    // Draw nodes
    nodes.forEach(node => {
      ctx.fillStyle = node.fillColor;
      ctx.strokeStyle = node.strokeColor;
      ctx.lineWidth = node.strokeWidth;
      
      const drawShape = () => {
        switch (node.type) {
          case 'rectangle':
            ctx.beginPath();
            ctx.roundRect(node.x, node.y, node.width, node.height, 4);
            ctx.fill();
            ctx.stroke();
            break;
          case 'ellipse':
            ctx.beginPath();
            ctx.ellipse(node.x + node.width / 2, node.y + node.height / 2, node.width / 2, node.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            break;
          case 'diamond':
            ctx.beginPath();
            ctx.moveTo(node.x + node.width / 2, node.y);
            ctx.lineTo(node.x + node.width, node.y + node.height / 2);
            ctx.lineTo(node.x + node.width / 2, node.y + node.height);
            ctx.lineTo(node.x, node.y + node.height / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
          case 'hexagon':
            const hw = node.width / 4;
            ctx.beginPath();
            ctx.moveTo(node.x + hw, node.y);
            ctx.lineTo(node.x + node.width - hw, node.y);
            ctx.lineTo(node.x + node.width, node.y + node.height / 2);
            ctx.lineTo(node.x + node.width - hw, node.y + node.height);
            ctx.lineTo(node.x + hw, node.y + node.height);
            ctx.lineTo(node.x, node.y + node.height / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
          case 'triangle':
            ctx.beginPath();
            ctx.moveTo(node.x + node.width / 2, node.y);
            ctx.lineTo(node.x + node.width, node.y + node.height);
            ctx.lineTo(node.x, node.y + node.height);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
          case 'cylinder':
            const cy = node.height * 0.15;
            ctx.beginPath();
            ctx.ellipse(node.x + node.width / 2, node.y + cy, node.width / 2, cy, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(node.x, node.y + cy);
            ctx.lineTo(node.x, node.y + node.height - cy);
            ctx.ellipse(node.x + node.width / 2, node.y + node.height - cy, node.width / 2, cy, 0, Math.PI, 0);
            ctx.lineTo(node.x + node.width, node.y + cy);
            ctx.fill();
            ctx.stroke();
            break;
          case 'cloud':
            ctx.beginPath();
            const cx = node.x + node.width * 0.5;
            const top = node.y + node.height * 0.3;
            ctx.arc(cx - node.width * 0.2, top, node.width * 0.2, Math.PI, 0);
            ctx.arc(cx + node.width * 0.15, top - node.height * 0.05, node.width * 0.22, Math.PI, 0);
            ctx.arc(cx + node.width * 0.35, node.y + node.height * 0.5, node.height * 0.25, -Math.PI * 0.5, Math.PI * 0.5);
            ctx.arc(cx, node.y + node.height * 0.75, node.width * 0.3, 0, Math.PI);
            ctx.arc(cx - node.width * 0.35, node.y + node.height * 0.5, node.height * 0.25, Math.PI * 0.5, -Math.PI * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
          case 'document':
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(node.x + node.width, node.y);
            ctx.lineTo(node.x + node.width, node.y + node.height * 0.85);
            ctx.quadraticCurveTo(node.x + node.width * 0.5, node.y + node.height * 0.7, node.x, node.y + node.height);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
          case 'person':
            // Head
            ctx.beginPath();
            ctx.arc(node.x + node.width / 2, node.y + node.height * 0.2, node.width * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Body
            ctx.beginPath();
            ctx.moveTo(node.x + node.width / 2, node.y + node.height * 0.35);
            ctx.lineTo(node.x + node.width / 2, node.y + node.height * 0.65);
            ctx.moveTo(node.x + node.width * 0.2, node.y + node.height * 0.5);
            ctx.lineTo(node.x + node.width * 0.8, node.y + node.height * 0.5);
            ctx.moveTo(node.x + node.width / 2, node.y + node.height * 0.65);
            ctx.lineTo(node.x + node.width * 0.25, node.y + node.height);
            ctx.moveTo(node.x + node.width / 2, node.y + node.height * 0.65);
            ctx.lineTo(node.x + node.width * 0.75, node.y + node.height);
            ctx.stroke();
            break;
          case 'star':
            const spikes = 5;
            const outerR = Math.min(node.width, node.height) / 2;
            const innerR = outerR * 0.4;
            const centerX = node.x + node.width / 2;
            const centerY = node.y + node.height / 2;
            ctx.beginPath();
            for (let i = 0; i < spikes * 2; i++) {
              const r = i % 2 === 0 ? outerR : innerR;
              const angle = (i * Math.PI) / spikes - Math.PI / 2;
              if (i === 0) ctx.moveTo(centerX + r * Math.cos(angle), centerY + r * Math.sin(angle));
              else ctx.lineTo(centerX + r * Math.cos(angle), centerY + r * Math.sin(angle));
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
          case 'callout':
            ctx.beginPath();
            ctx.roundRect(node.x, node.y, node.width, node.height * 0.8, 8);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(node.x + node.width * 0.2, node.y + node.height * 0.8);
            ctx.lineTo(node.x + node.width * 0.1, node.y + node.height);
            ctx.lineTo(node.x + node.width * 0.35, node.y + node.height * 0.8);
            ctx.fill();
            ctx.stroke();
            break;
          case 'parallelogram':
            const offset = node.width * 0.2;
            ctx.beginPath();
            ctx.moveTo(node.x + offset, node.y);
            ctx.lineTo(node.x + node.width, node.y);
            ctx.lineTo(node.x + node.width - offset, node.y + node.height);
            ctx.lineTo(node.x, node.y + node.height);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
          case 'text':
            // Just draw text, no shape
            break;
        }
      };
      
      drawShape();
      
      // Draw text
      if (node.text) {
        ctx.fillStyle = node.strokeColor;
        ctx.font = `${node.fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lines = node.text.split('\n');
        const lineHeight = node.fontSize * 1.2;
        const startY = node.y + node.height / 2 - (lines.length - 1) * lineHeight / 2;
        lines.forEach((line, i) => {
          ctx.fillText(line, node.x + node.width / 2, startY + i * lineHeight);
        });
      }
      
      // Selection highlight
      if (selectedNodeId === node.id) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(node.x - 4, node.y - 4, node.width + 8, node.height + 8);
        ctx.setLineDash([]);
        
        // Resize handles
        ctx.fillStyle = '#3b82f6';
        const handles = [
          { x: node.x - 4, y: node.y - 4 },
          { x: node.x + node.width, y: node.y - 4 },
          { x: node.x - 4, y: node.y + node.height },
          { x: node.x + node.width, y: node.y + node.height },
        ];
        handles.forEach(h => {
          ctx.fillRect(h.x, h.y, 8, 8);
        });
      }
    });
    
    // Draw preview for new shape
    if (isDrawing && drawStart && tool !== 'select' && tool !== 'pan' && tool !== 'line' && tool !== 'arrow') {
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = fillColor + '80';
      ctx.lineWidth = strokeWidth;
      ctx.setLineDash([5, 5]);
      // Preview rectangle for any shape
      const point = getCanvasPoint({ clientX: 0, clientY: 0 } as any); // Will be updated
      ctx.strokeRect(drawStart.x, drawStart.y, 100, 80);
      ctx.setLineDash([]);
    }
    
    ctx.restore();
  }, [nodes, connections, selectedNodeId, selectedConnectionId, zoom, pan, showGrid, backgroundColor, isDrawing, drawStart, tool, fillColor, strokeColor, strokeWidth]);
  
  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;
    const point = getCanvasPoint(e);
    
    if (tool === 'select') {
      const node = findNodeAtPoint(point);
      if (node) {
        setSelectedNodeId(node.id);
        setSelectedConnectionId(null);
        setIsDrawing(true);
        setDrawStart(point);
      } else {
        setSelectedNodeId(null);
        setSelectedConnectionId(null);
      }
      return;
    }
    
    if (tool === 'pan') {
      setIsDrawing(true);
      return;
    }
    
    if (tool === 'line' || tool === 'arrow') {
      const node = findNodeAtPoint(point);
      if (node) {
        if (!connectingFrom) {
          setConnectingFrom(node.id);
        } else {
          // Create connection
          const newConnection: DiagramConnection = {
            id: Date.now().toString(),
            type: tool,
            fromNode: connectingFrom,
            toNode: node.id,
            fromAnchor: 'right',
            toAnchor: 'left',
            strokeColor,
            strokeWidth,
          };
          setConnections([...connections, newConnection]);
          setConnectingFrom(null);
          saveToHistory();
        }
      }
      return;
    }
    
    if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        const newNode: DiagramNode = {
          id: Date.now().toString(),
          type: 'text',
          x: point.x,
          y: point.y,
          width: text.length * 10,
          height: 24,
          text,
          fillColor: 'transparent',
          strokeColor,
          strokeWidth: 0,
          fontSize: 14,
        };
        setNodes([...nodes, newNode]);
        saveToHistory();
      }
      return;
    }
    
    // Shape tools - instant placement with single click
    const isShapeTool = ['rectangle', 'ellipse', 'diamond', 'hexagon', 'triangle', 'cylinder', 'document', 'cloud', 'parallelogram', 'star', 'callout', 'person'].includes(tool);
    if (isShapeTool) {
      // Create shape immediately on click with default size
      const newNode: DiagramNode = {
        id: Date.now().toString(),
        type: tool as ShapeType,
        x: point.x - 50,  // Center shape on click
        y: point.y - 40,
        width: 100,
        height: 80,
        text: '',
        fillColor,
        strokeColor,
        strokeWidth,
        fontSize: 14,
      };
      setNodes([...nodes, newNode]);
      setSelectedNodeId(newNode.id);
      saveToHistory();
      return;
    }
    
    // Shape tools (for drag-to-create - legacy behavior)
    setIsDrawing(true);
    setDrawStart(point);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    
    if (tool === 'pan') {
      setPan(p => ({
        x: p.x + e.movementX,
        y: p.y + e.movementY,
      }));
      return;
    }
    
    if (tool === 'select' && selectedNodeId && drawStart) {
      const point = getCanvasPoint(e);
      const dx = point.x - drawStart.x;
      const dy = point.y - drawStart.y;
      setNodes(nodes.map(n => 
        n.id === selectedNodeId 
          ? { ...n, x: n.x + dx, y: n.y + dy }
          : n
      ));
      setDrawStart(point);
    }
  };
  
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    
    if (tool === 'select' || tool === 'pan') {
      setIsDrawing(false);
      if (tool === 'select') saveToHistory();
      return;
    }
    
    // Create new shape
    if (drawStart) {
      const point = getCanvasPoint(e);
      const width = Math.max(80, Math.abs(point.x - drawStart.x));
      const height = Math.max(60, Math.abs(point.y - drawStart.y));
      
      const newNode: DiagramNode = {
        id: Date.now().toString(),
        type: tool as ShapeType,
        x: Math.min(drawStart.x, point.x),
        y: Math.min(drawStart.y, point.y),
        width,
        height,
        text: '',
        fillColor,
        strokeColor,
        strokeWidth,
        fontSize: 14,
      };
      
      setNodes([...nodes, newNode]);
      saveToHistory();
    }
    
    setIsDrawing(false);
    setDrawStart(null);
  };
  
  // Double click to edit text
  const handleDoubleClick = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e);
    const node = findNodeAtPoint(point);
    if (node) {
      setEditingTextId(node.id);
      setEditText(node.text);
    }
  };
  
  // Undo/Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setNodes(state.nodes);
      setConnections(state.connections);
      setHistoryIndex(newIndex);
    }
  };
  
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setNodes(state.nodes);
      setConnections(state.connections);
      setHistoryIndex(newIndex);
    }
  };
  
  // Delete selected
  const handleDelete = () => {
    if (selectedNodeId) {
      setNodes(nodes.filter(n => n.id !== selectedNodeId));
      setConnections(connections.filter(c => c.fromNode !== selectedNodeId && c.toNode !== selectedNodeId));
      setSelectedNodeId(null);
      saveToHistory();
    }
    if (selectedConnectionId) {
      setConnections(connections.filter(c => c.id !== selectedConnectionId));
      setSelectedConnectionId(null);
      saveToHistory();
    }
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedNodeId || selectedConnectionId)) {
        e.preventDefault();
        handleDelete();
      }
      // Escape to cancel connecting or return to select tool
      if (e.key === 'Escape') {
        if (connectingFrom) {
          setConnectingFrom(null);
        } else {
          setTool('select');
          setSelectedNodeId(null);
          setSelectedConnectionId(null);
        }
      }
      // Quick tool shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v': setTool('select'); break;
          case 'h': setTool('pan'); break;
          case 'r': setTool('rectangle'); break;
          case 'e': setTool('ellipse'); break;
          case 'd': setTool('diamond'); break;
          case 't': setTool('text'); break;
          case 'a': setTool('arrow'); break;
          case 'l': setTool('line'); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, selectedNodeId, selectedConnectionId, connectingFrom]);
  
  // Save text edit
  const saveTextEdit = () => {
    if (editingTextId) {
      setNodes(nodes.map(n => 
        n.id === editingTextId ? { ...n, text: editText } : n
      ));
      setEditingTextId(null);
      saveToHistory();
    }
  };

  // Group shapes by category for toolbar
  const toolsByCategory = shapeTemplates.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, typeof shapeTemplates>);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700 flex-wrap bg-gray-50 dark:bg-gray-800">
        {Object.entries(toolsByCategory).map(([category, tools]) => (
          <div key={category} className="flex items-center gap-0.5">
            <span className="text-xs text-gray-500 mr-1">{category}:</span>
            {tools.map(t => (
              <button
                key={t.type}
                onClick={() => setTool(t.type)}
                className={clsx(
                  "p-1.5 rounded transition-colors",
                  tool === t.type
                    ? "bg-blue-500 text-white"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
                title={t.label}
              >
                <t.icon size={16} />
              </button>
            ))}
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
          </div>
        ))}
        
        {/* Color pickers */}
        <div className="relative">
          <button
            onClick={() => { setShowFillPicker(!showFillPicker); setShowStrokePicker(false); }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1"
            title="Fill Color"
          >
            <div className="w-5 h-5 rounded border" style={{ backgroundColor: fillColor }} />
            <span className="text-xs">Fill</span>
          </button>
          {showFillPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border z-20">
              <div className="grid grid-cols-7 gap-1">
                {colors.map(c => (
                  <button
                    key={c}
                    onClick={() => { setFillColor(c); setShowFillPicker(false); }}
                    className={clsx("w-5 h-5 rounded", fillColor === c && "ring-2 ring-blue-500")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="relative">
          <button
            onClick={() => { setShowStrokePicker(!showStrokePicker); setShowFillPicker(false); }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1"
            title="Stroke Color"
          >
            <div className="w-5 h-5 rounded border-2" style={{ borderColor: strokeColor, backgroundColor: 'transparent' }} />
            <span className="text-xs">Stroke</span>
          </button>
          {showStrokePicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border z-20">
              <div className="grid grid-cols-7 gap-1">
                {colors.map(c => (
                  <button
                    key={c}
                    onClick={() => { setStrokeColor(c); setShowStrokePicker(false); }}
                    className={clsx("w-5 h-5 rounded", strokeColor === c && "ring-2 ring-blue-500")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        
        <select
          value={strokeWidth}
          onChange={e => setStrokeWidth(Number(e.target.value))}
          className="px-2 py-1 text-xs rounded border bg-transparent"
        >
          {[1, 2, 3, 4, 6, 8].map(w => (
            <option key={w} value={w}>{w}px</option>
          ))}
        </select>
        
        <div className="flex-1" />
        
        {/* Zoom */}
        <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
          <ZoomOut size={16} />
        </button>
        <span className="text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
          <ZoomIn size={16} />
        </button>
        
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={clsx("p-1.5 rounded", showGrid ? "bg-blue-100 dark:bg-blue-900 text-blue-600" : "hover:bg-gray-200 dark:hover:bg-gray-700")}
        >
          <Grid3X3 size={16} />
        </button>
        
        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
        
        <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30" title="Undo">
          <Undo size={16} />
        </button>
        <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30" title="Redo">
          <Redo size={16} />
        </button>
        <button onClick={handleDelete} disabled={!selectedNodeId && !selectedConnectionId} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-red-500" title="Delete">
          <Trash2 size={16} />
        </button>
        
        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
        
        <button 
          onClick={handleSaveToVault}
          disabled={saveStatus === 'saving'}
          className={clsx(
            "p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1",
            saveStatus === 'saved' ? "text-green-600" : "text-green-500"
          )}
          title="Save to Vault"
        >
          <Save size={16} />
          {saveStatus === 'saving' && <span className="text-xs">...</span>}
          {saveStatus === 'saved' && <span className="text-xs">✓</span>}
        </button>
      </div>
      
      {/* Connection mode indicator */}
      {connectingFrom && (
        <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-xs text-blue-600 border-b flex items-center gap-2">
          <span className="animate-pulse w-2 h-2 bg-blue-500 rounded-full" />
          Click another shape to connect, or press Escape to cancel
        </div>
      )}
      
      {/* Tool hint */}
      {!connectingFrom && tool !== 'select' && tool !== 'pan' && (
        <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 border-b">
          {tool === 'line' || tool === 'arrow' 
            ? 'Click a shape to start connecting' 
            : tool === 'text'
            ? 'Click to add text'
            : `Click to place ${tool} shape`}
        </div>
      )}
      
      {/* Text edit modal */}
      {editingTextId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setEditingTextId(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="font-medium mb-2">Edit Text</h3>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="w-full p-2 border rounded text-sm bg-transparent"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button onClick={saveTextEdit} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Save</button>
              <button onClick={() => setEditingTextId(null)} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm">Cancel</button>
            </div>
          </div>
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
          onMouseLeave={() => setIsDrawing(false)}
          onDoubleClick={handleDoubleClick}
          onDragStart={(e) => e.preventDefault()}
          draggable={false}
          className="w-full h-full"
          style={{ cursor: tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair' }}
        />
      </div>
    </div>
  );
};

export default DiagramMaker;

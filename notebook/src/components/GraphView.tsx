import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useAppStore } from '../store/store';
import { buildGraph, GraphData } from '../lib/linkManager';
import { RefreshCw } from 'lucide-react';

interface GraphViewProps {
  onNodeClick: (path: string) => void;
  width?: number;
  height?: number;
}

export const GraphView: React.FC<GraphViewProps> = ({ onNodeClick, width, height }) => {
  const { fileStructure, fileContents, theme } = useAppStore();
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [refreshKey, setRefreshKey] = useState(0);

  const loadGraph = useCallback(async () => {
    const graphData = await buildGraph(fileStructure, fileContents);
    setData(graphData);
  }, [fileStructure, fileContents]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph, refreshKey]);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
  }, []);

  useEffect(() => {
    if (width && height) {
      setDimensions({ width, height });
    }
  }, [width, height]);

  // Reset and recenter graph
  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
    }
  }, []);

  const isDark = theme === 'dark' || theme === 'obsidian';

  // Color palette for groups
  const groupColors = [
    '#4a9eff', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8',
    '#20c997', '#ff922b', '#748ffc', '#f06595', '#69db7c'
  ];

  // Custom node rendering with labels
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name?.replace(/\.md$/i, '') || '';
    const fontSize = Math.max(12 / globalScale, 3);
    const nodeSize = Math.sqrt(node.val || 1) * 4;
    
    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
    const color = groupColors[node.group % groupColors.length] || (isDark ? '#4a9eff' : '#007acc');
    ctx.fillStyle = color;
    ctx.fill();
    
    // Draw label below node
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = isDark ? '#e0e0e0' : '#333333';
    ctx.fillText(label, node.x, node.y + nodeSize + 2);
  }, [isDark, groupColors]);

  // Node pointer area for hover/click
  const nodePointerAreaPaint = useCallback((node: any, color: string, ctx: CanvasRenderingContext2D) => {
    const nodeSize = Math.sqrt(node.val || 1) * 4;
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeSize + 5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-white dark:bg-gray-900 overflow-hidden relative">
      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        className="absolute top-3 right-3 z-10 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Refresh Graph"
      >
        <RefreshCw size={18} className={isDark ? 'text-gray-300' : 'text-gray-600'} />
      </button>
      
      <ForceGraph2D
        ref={graphRef}
        key={refreshKey}
        width={width || dimensions.width}
        height={height || dimensions.height}
        graphData={data}
        nodeLabel="name"
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={nodePointerAreaPaint}
        linkColor={() => isDark ? '#555' : '#ccc'}
        linkWidth={1.5}
        backgroundColor={isDark ? '#171717' : '#ffffff'}
        onNodeClick={(node: any) => onNodeClick(node.id)}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        // Group nodes by folder using charge and link forces
        d3Force={(forceSimulation) => {
          forceSimulation
            .force('charge')
            ?.strength((node: any) => -100 - (node.val || 1) * 20);
        }}
      />
    </div>
  );
};

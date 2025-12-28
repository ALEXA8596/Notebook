import React, { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useAppStore } from '../store/store';
import { buildGraph, GraphData } from '../lib/linkManager';

interface GraphViewProps {
  onNodeClick: (path: string) => void;
  width?: number;
  height?: number;
}

export const GraphView: React.FC<GraphViewProps> = ({ onNodeClick, width, height }) => {
  const { fileStructure, theme } = useAppStore();
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    buildGraph(fileStructure).then(setData);
  }, [fileStructure]);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
  }, []);

  // Handle resize if props are provided (from FlexLayout)
  useEffect(() => {
    if (width && height) {
      setDimensions({ width, height });
    }
  }, [width, height]);

  const isDark = theme === 'dark' || theme === 'obsidian';

  return (
    <div ref={containerRef} className="w-full h-full bg-white dark:bg-[#1e1e1e] overflow-hidden">
      <ForceGraph2D
        width={width || dimensions.width}
        height={height || dimensions.height}
        graphData={data}
        nodeLabel="name"
        nodeColor={() => isDark ? '#4a9eff' : '#007acc'}
        linkColor={() => isDark ? '#555' : '#ccc'}
        backgroundColor={isDark ? '#1e1e1e' : '#ffffff'}
        onNodeClick={(node: any) => onNodeClick(node.id)}
        nodeRelSize={6}
      />
    </div>
  );
};

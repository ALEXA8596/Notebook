import { FileEntry } from '../store/store';
import { readFileContent } from './fileSystem';

export interface GraphNode {
  id: string;
  name: string;
  val: number; // size based on connections
  group?: number; // folder grouping for clustering
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export const extractLinks = (content: string): string[] => {
  const regex = /\[\[(.*?)\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1]);
  }
  return links;
};

// Get folder depth for priority (lower = higher in hierarchy)
const getDepth = (path: string): number => {
  return (path.match(/\//g) || []).length;
};

// Get parent folder for grouping
const getParentFolder = (path: string): string => {
  const parts = path.split('/');
  return parts.slice(0, -1).join('/');
};

export const buildGraph = async (files: FileEntry[], fileContents?: Record<string, string>): Promise<GraphData> => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const filePaths = new Set<string>();
  const folderGroups = new Map<string, number>();
  let groupCounter = 0;

  // Helper to flatten file structure with depth tracking
  const traverse = (entries: FileEntry[], depth = 0) => {
    for (const entry of entries) {
      if (entry.isDirectory && entry.children) {
        traverse(entry.children, depth + 1);
      } else {
        filePaths.add(entry.path);
        
        // Assign group based on parent folder
        const parentFolder = getParentFolder(entry.path);
        if (!folderGroups.has(parentFolder)) {
          folderGroups.set(parentFolder, groupCounter++);
        }
        
        nodes.push({
          id: entry.path,
          name: entry.name,
          val: 1,
          group: folderGroups.get(parentFolder)
        });
      }
    }
  };

  traverse(files);
  
  // Sort nodes by depth for duplicate resolution (higher in hierarchy first)
  const nodesByName = new Map<string, GraphNode[]>();
  for (const node of nodes) {
    const baseName = node.name.toLowerCase().replace(/\.md$/i, '');
    if (!nodesByName.has(baseName)) {
      nodesByName.set(baseName, []);
    }
    nodesByName.get(baseName)!.push(node);
  }
  
  // Sort each group by depth
  for (const [, nodeList] of nodesByName) {
    nodeList.sort((a, b) => getDepth(a.id) - getDepth(b.id));
  }

  // Now read content and find links
  for (const node of nodes) {
    if (node.name.endsWith('.md')) {
      try {
        const content = fileContents?.[node.id] ?? await readFileContent(node.id);
        const extracted = extractLinks(content);
        
        for (const linkName of extracted) {
          const baseName = linkName.toLowerCase().replace(/\.md$/i, '');
          const candidates = nodesByName.get(baseName);
          
          // Prioritize by hierarchy (first in sorted list = highest in hierarchy)
          const targetNode = candidates?.[0];
          
          if (targetNode) {
            links.push({
              source: node.id,
              target: targetNode.id
            });
            targetNode.val += 1;
            node.val += 1;
          }
        }
      } catch (e) {
        console.error(`Failed to read ${node.id} for graph`, e);
      }
    }
  }

  return { nodes, links };
};

import { FileEntry } from '../store/store';
import { readFileContent } from './fileSystem';

export interface GraphNode {
  id: string;
  name: string;
  val: number; // size based on connections
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

export const buildGraph = async (files: FileEntry[]): Promise<GraphData> => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const filePaths = new Set<string>();

  // Helper to flatten file structure
  const traverse = (entries: FileEntry[]) => {
    for (const entry of entries) {
      if (entry.isDirectory && entry.children) {
        traverse(entry.children);
      } else {
        filePaths.add(entry.path);
        nodes.push({
          id: entry.path,
          name: entry.name,
          val: 1
        });
      }
    }
  };

  traverse(files);

  // Now read content and find links
  // Note: Reading ALL files might be slow for large workspaces. 
  // In a real app, we'd cache this. For now, we'll do it on demand or startup.
  
  for (const node of nodes) {
    if (node.name.endsWith('.md')) {
      try {
        const content = await readFileContent(node.id);
        const extracted = extractLinks(content);
        
        for (const linkName of extracted) {
          // Find the target node by name (naive matching)
          // In a real app, we'd handle relative paths, etc.
          const targetNode = nodes.find(n => n.name === linkName || n.name === `${linkName}.md`);
          
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

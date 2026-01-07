import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Command, Search, File, FileText, Settings, Calendar, 
  ListTodo, BarChart3, Network, Bot, Moon, Sun, 
  FolderOpen, Plus, Save, Keyboard, X, Hash, Clock, Tag
} from 'lucide-react';
import { useAppStore } from '../store/store';
import { useTaskStore, Task } from '../store/taskStore';
import clsx from 'clsx';

type CommandCategory = 'file' | 'navigation' | 'task' | 'settings' | 'action';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  category: CommandCategory;
  keywords: string[];
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const { 
    fileStructure, 
    openFile, 
    setActiveFile, 
    theme, 
    setTheme,
    currentPath 
  } = useAppStore();
  
  const { tasks, addTask } = useTaskStore();
  
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  // Build command list
  const commands = useMemo<CommandItem[]>(() => {
    const cmds: CommandItem[] = [];
    
    // Navigation commands
    cmds.push({
      id: 'nav-graph',
      title: 'Open Graph View',
      subtitle: 'Visualize note connections',
      icon: <Network size={16} />,
      category: 'navigation',
      keywords: ['graph', 'network', 'connections', 'links'],
      action: () => window.dispatchEvent(new CustomEvent('app-open-graph')),
      shortcut: '⌘G',
    });
    
    cmds.push({
      id: 'nav-search',
      title: 'Search in Vault',
      subtitle: 'Find content across all files',
      icon: <Search size={16} />,
      category: 'navigation',
      keywords: ['search', 'find', 'query'],
      action: () => window.dispatchEvent(new CustomEvent('app-toggle-search')),
      shortcut: '⌘F',
    });
    
    cmds.push({
      id: 'nav-copilot',
      title: 'Open AI Copilot',
      subtitle: 'Chat with AI assistant',
      icon: <Bot size={16} />,
      category: 'navigation',
      keywords: ['ai', 'copilot', 'assistant', 'chat', 'gpt'],
      action: () => window.dispatchEvent(new CustomEvent('app-open-copilot')),
    });
    
    cmds.push({
      id: 'nav-tasks',
      title: 'Open Tasks',
      subtitle: 'Manage your tasks',
      icon: <ListTodo size={16} />,
      category: 'navigation',
      keywords: ['tasks', 'todo', 'list'],
      action: () => window.dispatchEvent(new CustomEvent('app-open-tasks')),
    });
    
    cmds.push({
      id: 'nav-calendar',
      title: 'Open Calendar',
      subtitle: 'View and schedule tasks',
      icon: <Calendar size={16} />,
      category: 'navigation',
      keywords: ['calendar', 'schedule', 'dates'],
      action: () => window.dispatchEvent(new CustomEvent('app-open-calendar')),
    });
    
    cmds.push({
      id: 'nav-insights',
      title: 'Open Insights',
      subtitle: 'View productivity analytics',
      icon: <BarChart3 size={16} />,
      category: 'navigation',
      keywords: ['insights', 'analytics', 'stats', 'productivity'],
      action: () => window.dispatchEvent(new CustomEvent('app-open-insights')),
    });
    
    // Action commands
    cmds.push({
      id: 'action-save',
      title: 'Save All',
      subtitle: 'Save all unsaved files',
      icon: <Save size={16} />,
      category: 'action',
      keywords: ['save', 'write'],
      action: () => window.dispatchEvent(new CustomEvent('app-save')),
      shortcut: '⌘S',
    });
    
    cmds.push({
      id: 'action-daily',
      title: 'Create Daily Note',
      subtitle: "Open or create today's note",
      icon: <Calendar size={16} />,
      category: 'action',
      keywords: ['daily', 'today', 'journal'],
      action: () => window.dispatchEvent(new CustomEvent('app-daily-note')),
    });
    
    cmds.push({
      id: 'action-new-file',
      title: 'New Note',
      subtitle: 'Create a new markdown file',
      icon: <Plus size={16} />,
      category: 'action',
      keywords: ['new', 'create', 'note', 'file'],
      action: () => window.dispatchEvent(new CustomEvent('app-new-file')),
      shortcut: '⌘N',
    });
    
    cmds.push({
      id: 'action-new-task',
      title: 'New Task',
      subtitle: 'Create a new task',
      icon: <ListTodo size={16} />,
      category: 'action',
      keywords: ['new', 'task', 'todo', 'create'],
      action: () => window.dispatchEvent(new CustomEvent('app-new-task')),
    });
    
    // Settings commands
    cmds.push({
      id: 'settings-open',
      title: 'Open Settings',
      subtitle: 'Configure application settings',
      icon: <Settings size={16} />,
      category: 'settings',
      keywords: ['settings', 'preferences', 'config'],
      action: () => window.dispatchEvent(new CustomEvent('app-open-settings')),
      shortcut: '⌘,',
    });
    
    cmds.push({
      id: 'settings-theme-dark',
      title: 'Switch to Dark Theme',
      subtitle: 'Enable dark mode',
      icon: <Moon size={16} />,
      category: 'settings',
      keywords: ['theme', 'dark', 'night', 'mode'],
      action: () => setTheme('dark'),
    });
    
    cmds.push({
      id: 'settings-theme-light',
      title: 'Switch to Light Theme',
      subtitle: 'Enable light mode',
      icon: <Sun size={16} />,
      category: 'settings',
      keywords: ['theme', 'light', 'day', 'mode'],
      action: () => setTheme('light'),
    });
    
    // File commands - recent files and all files
    const flattenFiles = (entries: typeof fileStructure, prefix = ''): { name: string; path: string }[] => {
      const result: { name: string; path: string }[] = [];
      for (const entry of entries) {
        if (entry.isDirectory && entry.children) {
          result.push(...flattenFiles(entry.children, entry.path));
        } else if (!entry.isDirectory) {
          result.push({ name: entry.name, path: entry.path });
        }
      }
      return result;
    };
    
    const files = flattenFiles(fileStructure);
    files.slice(0, 50).forEach(file => {
      cmds.push({
        id: `file-${file.path}`,
        title: file.name,
        subtitle: file.path.replace(currentPath || '', '').replace(/^[\\/]/, ''),
        icon: <FileText size={16} />,
        category: 'file',
        keywords: [file.name.toLowerCase(), ...file.name.toLowerCase().split(/[-_\s.]/g)],
        action: () => openFile(file.path),
      });
    });
    
    // Task commands - recent/important tasks
    tasks
      .filter(t => t.status !== 'done' && t.status !== 'archived')
      .slice(0, 10)
      .forEach(task => {
        cmds.push({
          id: `task-${task.id}`,
          title: task.title,
          subtitle: `${task.priority} priority • ${task.category}`,
          icon: <ListTodo size={16} />,
          category: 'task',
          keywords: [task.title.toLowerCase(), task.priority, task.category, ...task.tags],
          action: () => window.dispatchEvent(new CustomEvent('app-open-task', { detail: { taskId: task.id } })),
        });
      });
    
    return cmds;
  }, [fileStructure, openFile, setTheme, currentPath, tasks]);
  
  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show recent/important commands first
      return commands.filter(c => c.category !== 'file').slice(0, 15);
    }
    
    const q = query.toLowerCase();
    const scored = commands.map(cmd => {
      let score = 0;
      
      // Title match
      if (cmd.title.toLowerCase().includes(q)) score += 10;
      if (cmd.title.toLowerCase().startsWith(q)) score += 20;
      
      // Keyword match
      if (cmd.keywords.some(k => k.includes(q))) score += 5;
      if (cmd.keywords.some(k => k.startsWith(q))) score += 10;
      
      // Subtitle match
      if (cmd.subtitle?.toLowerCase().includes(q)) score += 3;
      
      return { cmd, score };
    });
    
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.cmd)
      .slice(0, 20);
  }, [commands, query]);
  
  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredCommands, selectedIndex, onClose]);
  
  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    const selected = list?.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);
  
  if (!isOpen) return null;
  
  const getCategoryLabel = (cat: CommandCategory) => {
    switch (cat) {
      case 'file': return 'Files';
      case 'navigation': return 'Navigation';
      case 'task': return 'Tasks';
      case 'settings': return 'Settings';
      case 'action': return 'Actions';
    }
  };
  
  // Group by category for display
  const groupedCommands: { category: CommandCategory; items: CommandItem[] }[] = [];
  let currentCat: CommandCategory | null = null;
  
  filteredCommands.forEach(cmd => {
    if (cmd.category !== currentCat) {
      currentCat = cmd.category;
      groupedCommands.push({ category: cmd.category, items: [] });
    }
    groupedCommands[groupedCommands.length - 1].items.push(cmd);
  });
  
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-[560px] max-h-[60vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Command size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-base placeholder-gray-400"
          />
          <kbd className="hidden sm:inline-flex px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 text-gray-500">
            ESC
          </kbd>
        </div>
        
        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <Search size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No commands found</p>
            </div>
          ) : (
            <>
              {groupedCommands.map(group => (
                <div key={group.category}>
                  <div className="px-4 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {getCategoryLabel(group.category)}
                  </div>
                  {group.items.map((cmd, i) => {
                    const globalIndex = filteredCommands.indexOf(cmd);
                    return (
                      <div
                        key={cmd.id}
                        className={clsx(
                          "flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors",
                          globalIndex === selectedIndex 
                            ? "bg-blue-500 text-white" 
                            : "hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                        onClick={() => {
                          cmd.action();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      >
                        <div className={clsx(
                          "flex-shrink-0",
                          globalIndex === selectedIndex ? "text-white" : "text-gray-400"
                        )}>
                          {cmd.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{cmd.title}</div>
                          {cmd.subtitle && (
                            <div className={clsx(
                              "text-xs truncate",
                              globalIndex === selectedIndex ? "text-blue-100" : "text-gray-500"
                            )}>
                              {cmd.subtitle}
                            </div>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <kbd className={clsx(
                            "flex-shrink-0 px-1.5 py-0.5 text-xs rounded border",
                            globalIndex === selectedIndex 
                              ? "bg-blue-400 border-blue-300 text-white" 
                              : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500"
                          )}>
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">↵</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
};

// Global keyboard shortcut listener component
export const CommandPaletteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K to open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      // Also ⌘P for quick file open
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    
    // Listen for custom event to open command palette
    const handleOpenEvent = () => setIsOpen(true);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleOpenEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleOpenEvent);
    };
  }, []);
  
  return (
    <>
      {children}
      <CommandPalette isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

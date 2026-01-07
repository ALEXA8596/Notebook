import React, { useState, useEffect } from 'react';
import { 
  FileText, Clock, Star, Calendar, CheckSquare, TrendingUp, 
  Sparkles, BookOpen, Layout, Settings, Plus, X, GripVertical,
  ChevronRight, Search, Zap, Target, Coffee, Sun, Moon, Cloud,
  Folder, Edit3, BarChart3, Bot, Network, Command, Info, Timer
} from 'lucide-react';
import { useAppStore } from '../store/store';
import { useTaskStore } from '../store/taskStore';
import clsx from 'clsx';

interface Widget {
  id: string;
  type: 'recent-files' | 'quick-actions' | 'tasks-today' | 'calendar-preview' | 'stats' | 'quick-note' | 'favorites' | 'quote' | 'weather-clock';
  title: string;
  enabled: boolean;
  position: number;
  size: 'small' | 'medium' | 'large';
}

interface HomepageSettings {
  greeting: string;
  showGreeting: boolean;
  backgroundStyle: 'gradient' | 'solid' | 'pattern';
  accentColor: string;
  widgets: Widget[];
  dailyQuote: boolean;
}

const defaultSettings: HomepageSettings = {
  greeting: 'Welcome back',
  showGreeting: true,
  backgroundStyle: 'gradient',
  accentColor: '#6366f1',
  dailyQuote: true,
  widgets: [
    { id: 'recent', type: 'recent-files', title: 'Recent Files', enabled: true, position: 0, size: 'medium' },
    { id: 'actions', type: 'quick-actions', title: 'Quick Actions', enabled: true, position: 1, size: 'small' },
    { id: 'tasks', type: 'tasks-today', title: "Today's Tasks", enabled: true, position: 2, size: 'medium' },
    { id: 'stats', type: 'stats', title: 'Activity Stats', enabled: true, position: 3, size: 'small' },
    { id: 'favorites', type: 'favorites', title: 'Favorites', enabled: true, position: 4, size: 'medium' },
    { id: 'quote', type: 'quote', title: 'Daily Inspiration', enabled: true, position: 5, size: 'small' },
  ],
};

const quotes = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Your limitation—it's only your imagination.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
];

// Load settings from localStorage
const loadHomepageSettings = (): HomepageSettings => {
  try {
    const saved = localStorage.getItem('homepage-settings');
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load homepage settings', e);
  }
  return defaultSettings;
};

const saveHomepageSettings = (settings: HomepageSettings) => {
  localStorage.setItem('homepage-settings', JSON.stringify(settings));
};

// Load favorites from localStorage
const loadFavorites = (): string[] => {
  try {
    const saved = localStorage.getItem('favorite-files');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
};

const saveFavorites = (favorites: string[]) => {
  localStorage.setItem('favorite-files', JSON.stringify(favorites));
};

interface HomepageProps {
  onOpenFile: (path: string) => void;
  onOpenPanel: (panel: 'tasks' | 'calendar' | 'insights' | 'graph' | 'copilot' | 'about') => void;
  onSearch: () => void;
  onCommandPalette: () => void;
}

export const Homepage: React.FC<HomepageProps> = ({ 
  onOpenFile, 
  onOpenPanel,
  onSearch,
  onCommandPalette
}) => {
  const { viewedHistory, fileStructure, currentPath, recentFiles: persistedRecent } = useAppStore();
  const { tasks } = useTaskStore();
  const [settings, setSettings] = useState<HomepageSettings>(loadHomepageSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayQuote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);
  
  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Save settings when changed
  useEffect(() => {
    saveHomepageSettings(settings);
  }, [settings]);
  
  const toggleFavorite = (path: string) => {
    const newFavorites = favorites.includes(path)
      ? favorites.filter(f => f !== path)
      : [...favorites, path];
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
  };
  
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };
  
  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const todayTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    const today = new Date();
    return due.toDateString() === today.toDateString() && t.status !== 'done';
  });
  
  // Use persisted recent files if available, fallback to viewed history
  // Filter to check if files still exist
  const [existingRecentFiles, setExistingRecentFiles] = useState<string[]>([]);
  
  useEffect(() => {
    let cancelled = false;
    
    const checkFiles = async () => {
      const filesToCheck = persistedRecent.length > 0 
        ? persistedRecent.slice(0, 8) 
        : viewedHistory.slice(-8).reverse();
      
      const existing = [];
      for (const filePath of filesToCheck) {
        if (cancelled) return;
        try {
          const exists = await window.electronAPI.exists(filePath);
          if (exists) {
            existing.push(filePath);
          }
        } catch (e) {
          // File doesn't exist or error checking, skip it
        }
      }
      if (!cancelled) {
        setExistingRecentFiles(existing);
      }
    };
    
    checkFiles();
    
    return () => { cancelled = true; };
  }, [persistedRecent, viewedHistory]);
  
  const recentFiles = existingRecentFiles;
  
  const totalNotes = fileStructure.reduce((count, entry) => {
    const countFiles = (e: typeof entry): number => {
      if (e.isDirectory) {
        return (e.children || []).reduce((c, child) => c + countFiles(child), 0);
      }
      return e.name.endsWith('.md') ? 1 : 0;
    };
    return count + countFiles(entry);
  }, 0);
  
  const completedToday = tasks.filter(t => {
    if (t.status !== 'done' || !t.updatedAt) return false;
    const completed = new Date(t.updatedAt);
    const today = new Date();
    return completed.toDateString() === today.toDateString();
  }).length;
  
  const enabledWidgets = settings.widgets
    .filter(w => w.enabled)
    .sort((a, b) => a.position - b.position);

  const renderWidget = (widget: Widget) => {
    switch (widget.type) {
      case 'recent-files':
        return (
          <div className="space-y-2">
            {recentFiles.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent files yet</p>
            ) : (
              recentFiles.map((path, i) => {
                const name = path.split(/[/\\]/).pop() || path;
                const isFavorite = favorites.includes(path);
                return (
                  <div 
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group transition-colors"
                    onClick={() => onOpenFile(path)}
                  >
                    <FileText size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="flex-1 truncate text-sm">{name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(path); }}
                      className={clsx(
                        "p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                        isFavorite ? "text-yellow-500" : "text-gray-400 hover:text-yellow-500"
                      )}
                    >
                      <Star size={14} fill={isFavorite ? "currentColor" : "none"} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        );
        
      case 'quick-actions':
        return (
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Plus, label: 'New Note', action: () => window.dispatchEvent(new CustomEvent('app-new-file')) },
              { icon: Search, label: 'Search', action: onSearch },
              { icon: Command, label: 'Commands', action: onCommandPalette },
              { icon: CheckSquare, label: 'Tasks', action: () => onOpenPanel('tasks') },
              { icon: Calendar, label: 'Calendar', action: () => onOpenPanel('calendar') },
              { icon: BarChart3, label: 'Insights', action: () => onOpenPanel('insights') },
              { icon: Network, label: 'Graph', action: () => onOpenPanel('graph') },
              { icon: Bot, label: 'AI Copilot', action: () => onOpenPanel('copilot') },
              { icon: Edit3, label: 'Quick Note', action: () => window.dispatchEvent(new CustomEvent('app-open-quicknote')) },
              { icon: Timer, label: 'Focus Mode', action: () => window.dispatchEvent(new CustomEvent('app-open-focus-mode')) },
            ].map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                <item.icon size={16} className="text-indigo-500" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        );
        
      case 'tasks-today':
        return (
          <div className="space-y-2">
            {todayTasks.length === 0 ? (
              <div className="text-center py-4">
                <Target size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-gray-500 text-sm">No tasks for today!</p>
                <button 
                  onClick={() => onOpenPanel('tasks')}
                  className="mt-2 text-indigo-500 text-sm hover:underline"
                >
                  Add a task
                </button>
              </div>
            ) : (
              todayTasks.slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className={clsx(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    task.priority === 'urgent' ? 'bg-red-500' :
                    task.priority === 'high' ? 'bg-orange-500' :
                    task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  )} />
                  <span className="flex-1 truncate text-sm">{task.title}</span>
                </div>
              ))
            )}
            {todayTasks.length > 5 && (
              <button 
                onClick={() => onOpenPanel('tasks')}
                className="text-indigo-500 text-sm hover:underline"
              >
                +{todayTasks.length - 5} more tasks
              </button>
            )}
          </div>
        );
        
      case 'stats':
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
              <FileText size={20} className="text-gray-500 dark:text-gray-300 mb-1" />
              <p className="text-2xl font-bold">{totalNotes}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Notes</p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30">
              <CheckSquare size={20} className="text-green-500 mb-1" />
              <p className="text-2xl font-bold">{completedToday}</p>
              <p className="text-xs text-gray-500">Completed Today</p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30">
              <TrendingUp size={20} className="text-purple-500 mb-1" />
              <p className="text-2xl font-bold">{viewedHistory.length}</p>
              <p className="text-xs text-gray-500">Files Viewed</p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30">
              <Star size={20} className="text-amber-500 mb-1" />
              <p className="text-2xl font-bold">{favorites.length}</p>
              <p className="text-xs text-gray-500">Favorites</p>
            </div>
          </div>
        );
        
      case 'favorites':
        return (
          <div className="space-y-2">
            {favorites.length === 0 ? (
              <div className="text-center py-4">
                <Star size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-gray-500 text-sm">No favorites yet</p>
                <p className="text-gray-400 text-xs mt-1">Star files to see them here</p>
              </div>
            ) : (
              favorites.slice(0, 6).map((path, i) => {
                const name = path.split(/[/\\]/).pop() || path;
                return (
                  <div 
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group transition-colors"
                    onClick={() => onOpenFile(path)}
                  >
                    <Star size={16} className="text-yellow-500 flex-shrink-0" fill="currentColor" />
                    <span className="flex-1 truncate text-sm">{name}</span>
                    <ChevronRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100" />
                  </div>
                );
              })
            )}
          </div>
        );
        
      case 'quote':
        return (
          <div className="text-center py-2">
            <Sparkles size={24} className="mx-auto text-indigo-400 mb-3" />
            <p className="text-sm italic text-gray-600 dark:text-gray-400 mb-2">"{todayQuote.text}"</p>
            <p className="text-xs text-gray-500">— {todayQuote.author}</p>
          </div>
        );
        
      default:
        return <div>Unknown widget</div>;
    }
  };
  
  const widgetSizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-2',
    large: 'col-span-1 md:col-span-3',
  };

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-5xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            {settings.showGreeting && (
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {getGreeting()}
              </h1>
            )}
            <p className="text-gray-500 flex items-center gap-2">
              <Calendar size={16} />
              {formatDate()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenPanel('about')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="About Notebook"
            >
              <Info size={20} className="text-gray-500" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Customize Homepage"
            >
              <Settings size={20} className="text-gray-500" />
            </button>
          </div>
        </div>
        
        {/* Time Display */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-5xl font-light tracking-tight">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-indigo-200 mt-1">
                {currentPath ? `📁 ${currentPath.split(/[/\\]/).pop()}` : 'No vault open'}
              </p>
            </div>
            <div className="text-right">
              {currentTime.getHours() < 18 ? (
                <Sun size={48} className="text-yellow-300" />
              ) : (
                <Moon size={48} className="text-indigo-200" />
              )}
            </div>
          </div>
        </div>
        
        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Customize Homepage</h3>
              <button onClick={() => setShowSettings(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.showGreeting}
                  onChange={e => setSettings(s => ({ ...s, showGreeting: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Show greeting</span>
              </label>
              
              <div>
                <p className="text-sm font-medium mb-2">Widgets</p>
                <div className="space-y-2">
                  {settings.widgets.map((widget, i) => (
                    <div key={widget.id} className="flex items-center gap-2 p-2 rounded bg-gray-50 dark:bg-gray-700">
                      <GripVertical size={14} className="text-gray-400" />
                      <input
                        type="checkbox"
                        checked={widget.enabled}
                        onChange={e => {
                          const newWidgets = [...settings.widgets];
                          newWidgets[i] = { ...widget, enabled: e.target.checked };
                          setSettings(s => ({ ...s, widgets: newWidgets }));
                        }}
                        className="rounded"
                      />
                      <span className="text-sm flex-1">{widget.title}</span>
                      <select
                        value={widget.size}
                        onChange={e => {
                          const newWidgets = [...settings.widgets];
                          newWidgets[i] = { ...widget, size: e.target.value as Widget['size'] };
                          setSettings(s => ({ ...s, widgets: newWidgets }));
                        }}
                        className="text-xs p-1 rounded border dark:bg-gray-600 dark:border-gray-500"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {enabledWidgets.map(widget => (
            <div
              key={widget.id}
              className={clsx(
                "p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm",
                widgetSizeClasses[widget.size]
              )}
            >
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                {widget.type === 'recent-files' && <Clock size={14} />}
                {widget.type === 'quick-actions' && <Zap size={14} />}
                {widget.type === 'tasks-today' && <CheckSquare size={14} />}
                {widget.type === 'stats' && <BarChart3 size={14} />}
                {widget.type === 'favorites' && <Star size={14} />}
                {widget.type === 'quote' && <BookOpen size={14} />}
                {widget.title}
              </h3>
              {renderWidget(widget)}
            </div>
          ))}
        </div>
        
        {/* Keyboard Shortcuts Hint */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            Press <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">⌘K</kbd> for commands
            {' • '}
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">⌘O</kbd> quick switcher
            {' • '}
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">⌘S</kbd> save
          </p>
        </div>
      </div>
    </div>
  );
};

export default Homepage;

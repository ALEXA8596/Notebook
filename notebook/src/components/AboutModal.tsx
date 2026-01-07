import React, { useState } from 'react';
import { 
  X, BookOpen, Code, Shield, Zap, Heart, Github, 
  ExternalLink, FileText, CheckSquare, Calendar, BarChart3,
  Lock, Bot, Network, Palette, FolderOpen, Search, Command,
  Clock, Star, Layout, Layers, Sparkles, Coffee, Mail,
  ChevronRight, Globe, Database, Cloud
} from 'lucide-react';
import clsx from 'clsx';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'overview' | 'features' | 'shortcuts' | 'system' | 'credits';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'features', label: 'Features', icon: Sparkles },
  { id: 'shortcuts', label: 'Shortcuts', icon: Command },
  { id: 'system', label: 'System Info', icon: Code },
  { id: 'credits', label: 'Credits', icon: Heart },
];

const features = [
  {
    category: 'Writing & Notes',
    icon: FileText,
    color: 'text-blue-500',
    items: [
      { name: 'Block-based Editor', desc: 'Write in markdown with rich formatting, code blocks, and embeds' },
      { name: 'Bi-directional Links', desc: 'Connect notes with [[wiki-style]] links and see backlinks' },
      { name: 'Daily Notes', desc: 'Quick access to daily journal entries with templates' },
      { name: 'Version History', desc: 'Track changes and restore previous versions of your notes' },
      { name: 'Encrypted Notes', desc: 'AES-256 encryption for sensitive information' },
    ]
  },
  {
    category: 'Task Management',
    icon: CheckSquare,
    color: 'text-green-500',
    items: [
      { name: 'Hierarchical Tasks', desc: 'Create tasks with subtasks and dependencies' },
      { name: 'Time Tracking', desc: 'Track time spent on tasks with built-in timers' },
      { name: 'Priority & Categories', desc: 'Organize tasks by priority levels and custom categories' },
      { name: 'AI Task Parser', desc: 'Natural language input to create tasks automatically' },
    ]
  },
  {
    category: 'Organization',
    icon: Layers,
    color: 'text-purple-500',
    items: [
      { name: 'Graph View', desc: 'Visualize connections between your notes' },
      { name: 'Calendar View', desc: 'See tasks and events on a monthly, weekly, or daily calendar' },
      { name: 'File Explorer', desc: 'Navigate your vault with drag-and-drop support' },
      { name: 'Quick Switcher', desc: 'Instantly jump to any file with fuzzy search' },
      { name: 'Favorites', desc: 'Star your most important files for quick access' },
    ]
  },
  {
    category: 'Productivity',
    icon: Zap,
    color: 'text-amber-500',
    items: [
      { name: 'Command Palette', desc: 'Access any command instantly with ⌘K' },
      { name: 'Focus Mode', desc: 'Distraction-free writing with Pomodoro timer' },
      { name: 'Activity Insights', desc: 'Track your productivity with detailed analytics' },
      { name: 'Autosave', desc: 'Never lose work with automatic saving' },
    ]
  },
  {
    category: 'AI Features',
    icon: Bot,
    color: 'text-indigo-500',
    items: [
      { name: 'AI Copilot', desc: 'Chat with AI for writing help, summaries, and more' },
      { name: 'Multiple Providers', desc: 'Connect to OpenAI, Anthropic, or local models' },
      { name: 'Tool Execution', desc: 'AI can search, create files, and execute actions' },
      { name: 'Web Research', desc: 'AI can research topics online and summarize findings' },
    ]
  },
  {
    category: 'Customization',
    icon: Palette,
    color: 'text-pink-500',
    items: [
      { name: 'Themes', desc: 'Choose from 18+ beautiful themes or create your own' },
      { name: 'Plugins', desc: 'Extend functionality with JavaScript plugins' },
      { name: 'Custom Homepage', desc: 'Personalize your dashboard with widgets' },
      { name: 'Flexible Layout', desc: 'Drag and drop tabs horizontally or vertically' },
    ]
  },
  {
    category: 'Drawing & Diagrams',
    icon: Layout,
    color: 'text-cyan-500',
    items: [
      { name: 'Whiteboard', desc: 'Freeform drawing with pencil, shapes, and text tools' },
      { name: 'Diagram Maker', desc: 'Create flowcharts and diagrams like draw.io' },
      { name: 'Excalidraw', desc: 'Sketch-style diagrams embedded in notes' },
      { name: 'Mermaid Diagrams', desc: 'Generate flowcharts from text syntax' },
    ]
  },
  {
    category: 'Embeds & Media',
    icon: Database,
    color: 'text-emerald-500',
    items: [
      { name: 'Kanban Boards', desc: 'Visual task management with drag-and-drop cards' },
      { name: 'Spreadsheets', desc: 'Embedded spreadsheet editing with formulas' },
      { name: 'Code Blocks', desc: 'Syntax highlighting for 100+ languages' },
      { name: 'PDFs & Media', desc: 'View PDFs and embed external content' },
      { name: 'Website Embeds', desc: 'Embed any website directly in your notes' },
    ]
  },
  {
    category: 'Sync & Backup',
    icon: Cloud,
    color: 'text-sky-500',
    items: [
      { name: 'Google Drive', desc: 'Sync your vault to Google Drive for backup' },
      { name: 'Local Storage', desc: 'All data stored locally for privacy and speed' },
      { name: 'Export Options', desc: 'Export notes as Markdown, PDF, or HTML' },
    ]
  },
];

const shortcuts = [
  { category: 'General', items: [
    { keys: ['⌘', 'K'], desc: 'Open Command Palette' },
    { keys: ['⌘', 'O'], desc: 'Quick Switcher' },
    { keys: ['⌘', 'S'], desc: 'Save Current File' },
    { keys: ['⌘', 'N'], desc: 'New Note' },
    { keys: ['⌘', 'Shift', 'F'], desc: 'Search in Files' },
    { keys: ['⌘', ','], desc: 'Open Settings' },
  ]},
  { category: 'Editor', items: [
    { keys: ['⌘', 'B'], desc: 'Bold' },
    { keys: ['⌘', 'I'], desc: 'Italic' },
    { keys: ['⌘', 'K'], desc: 'Insert Link' },
    { keys: ['⌘', 'Shift', 'C'], desc: 'Code Block' },
    { keys: ['⌘', '['], desc: 'Decrease Indent' },
    { keys: ['⌘', ']'], desc: 'Increase Indent' },
    { keys: ['⌘', '/'], desc: 'Toggle Comment' },
  ]},
  { category: 'Navigation', items: [
    { keys: ['⌘', 'Click'], desc: 'Open Link in New Tab' },
    { keys: ['Alt', '←'], desc: 'Go Back' },
    { keys: ['Alt', '→'], desc: 'Go Forward' },
    { keys: ['⌘', 'G'], desc: 'Open Graph View' },
    { keys: ['⌘', 'T'], desc: 'Open Tasks' },
  ]},
];

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-600">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <BookOpen size={28} className="text-white" />
            </div>
            <div className="text-white">
              <h1 className="text-2xl font-bold">Notebook</h1>
              <p className="text-indigo-200 text-sm">Your Personal Knowledge Base</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  <strong>Notebook</strong> is a powerful, privacy-focused note-taking application 
                  inspired by Obsidian and Notion. It combines the flexibility of markdown with 
                  advanced features like bi-directional linking, task management, and AI assistance.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
                  <Shield size={24} className="text-blue-500 mb-2" />
                  <h3 className="font-semibold mb-1">Privacy First</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">All data stored locally. Optional encryption for sensitive notes.</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
                  <Zap size={24} className="text-green-500 mb-2" />
                  <h3 className="font-semibold mb-1">Lightning Fast</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Built with Electron and React for native performance.</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-800">
                  <Code size={24} className="text-purple-500 mb-2" />
                  <h3 className="font-semibold mb-1">Extensible</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Custom themes and plugins to make it yours.</p>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Globe size={18} className="text-indigo-500" />
                  Quick Start
                </h3>
                <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                    <span>Open or create a vault (folder) to store your notes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                    <span>Create your first note using the + button or ⌘N</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                    <span>Link notes together with [[double brackets]] to create a knowledge graph</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                    <span>Explore the graph view to visualize connections between your notes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0">5</span>
                    <span>Customize your experience with themes, plugins, and settings</span>
                  </li>
                </ol>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" />
                  Key Highlights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start gap-2 p-2 rounded bg-gray-100 dark:bg-gray-800">
                    <span className="text-indigo-500 font-bold">✓</span>
                    <span>Bi-directional linking with automatic backlinks</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded bg-gray-100 dark:bg-gray-800">
                    <span className="text-indigo-500 font-bold">✓</span>
                    <span>Multi-format support (Markdown, Excalidraw, Mermaid, etc.)</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded bg-gray-100 dark:bg-gray-800">
                    <span className="text-indigo-500 font-bold">✓</span>
                    <span>Full-text search across your entire vault</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded bg-gray-100 dark:bg-gray-800">
                    <span className="text-indigo-500 font-bold">✓</span>
                    <span>Version history for tracking changes</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded bg-gray-100 dark:bg-gray-800">
                    <span className="text-indigo-500 font-bold">✓</span>
                    <span>AI Copilot for writing assistance</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded bg-gray-100 dark:bg-gray-800">
                    <span className="text-indigo-500 font-bold">✓</span>
                    <span>18+ beautiful themes included</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-4 pt-4">
                <span className="text-sm text-gray-500">Version 1.0.0</span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="text-sm text-gray-500">Built with ❤️ on Electron</span>
              </div>
            </div>
          )}
          
          {activeTab === 'features' && (
            <div className="space-y-6">
              {features.map((category, i) => (
                <div key={i}>
                  <h3 className={clsx("flex items-center gap-2 font-semibold mb-3", category.color)}>
                    <category.icon size={18} />
                    {category.category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {category.items.map((item, j) => (
                      <div key={j} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {activeTab === 'shortcuts' && (
            <div className="space-y-6">
              {shortcuts.map((category, i) => (
                <div key={i}>
                  <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">{category.category}</h3>
                  <div className="space-y-2">
                    {category.items.map((item, j) => (
                      <div key={j} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((key, k) => (
                            <React.Fragment key={k}>
                              <kbd className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                                {key}
                              </kbd>
                              {k < item.keys.length - 1 && <span className="text-gray-400">+</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <Database size={18} />
                  System Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 rounded bg-white dark:bg-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">App Version:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">1.0.0</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-white dark:bg-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">Electron:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">39.2.7</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-white dark:bg-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">React:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">19.1.0</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-white dark:bg-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">TypeScript:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">5.8.3</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-white dark:bg-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">License:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">MIT</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-purple-900 dark:text-purple-100">
                  <Settings size={18} />
                  Technical Stack
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 rounded bg-white dark:bg-gray-800">
                    <p className="font-medium text-gray-900 dark:text-gray-100">Frontend</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">React + TypeScript</p>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-gray-800">
                    <p className="font-medium text-gray-900 dark:text-gray-100">Styling</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Tailwind CSS</p>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-gray-800">
                    <p className="font-medium text-gray-900 dark:text-gray-100">State</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Zustand</p>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-gray-800">
                    <p className="font-medium text-gray-900 dark:text-gray-100">Layout</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">FlexLayout</p>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-gray-800">
                    <p className="font-medium text-gray-900 dark:text-gray-100">Editor</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Monaco Editor</p>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-gray-800">
                    <p className="font-medium text-gray-900 dark:text-gray-100">Diagrams</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Mermaid + D3.js</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-900 dark:text-green-100">
                  <FileText size={18} />
                  Features & Capabilities
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">+</span>
                    <span>Multi-format document support (18+ formats)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">+</span>
                    <span>Advanced full-text search with regex support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">+</span>
                    <span>Graph visualization with interactive node layout</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">+</span>
                    <span>Version history with automatic snapshots</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">+</span>
                    <span>AES-256 encryption for sensitive notes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">+</span>
                    <span>Plugin & theme system for extensibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">+</span>
                    <span>Cloud sync with Google Drive & Dropbox</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">+</span>
                    <span>Productivity analytics & insights dashboard</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
          
          {activeTab === 'credits' && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Heart size={36} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Thank You!</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Notebook is built with love and powered by amazing open-source technologies.
                </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'Electron', desc: 'Desktop framework' },
                  { name: 'React', desc: 'UI library' },
                  { name: 'TypeScript', desc: 'Type safety' },
                  { name: 'Zustand', desc: 'State management' },
                  { name: 'Tailwind CSS', desc: 'Styling' },
                  { name: 'FlexLayout', desc: 'Tab management' },
                  { name: 'D3.js', desc: 'Graph visualization' },
                  { name: 'Monaco Editor', desc: 'Code editing' },
                  { name: 'Excalidraw', desc: 'Whiteboard' },
                  { name: 'Mermaid', desc: 'Diagrams' },
                  { name: 'Lucide', desc: 'Icons' },
                  { name: 'Vite', desc: 'Build tool' },
                ].map((tech, i) => (
                  <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-center">
                    <p className="font-medium text-sm">{tech.name}</p>
                    <p className="text-xs text-gray-500">{tech.desc}</p>
                  </div>
                ))}
              </div>
              
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Found a bug or have a suggestion?
                </p>
                <div className="flex items-center justify-center gap-3">
                  <a href="#" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 transition-colors">
                    <Github size={16} />
                    GitHub
                  </a>
                  <a href="#" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm hover:bg-indigo-600 transition-colors">
                    <Mail size={16} />
                    Feedback
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AboutModal;

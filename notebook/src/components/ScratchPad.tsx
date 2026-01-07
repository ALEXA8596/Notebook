import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StickyNote, Plus, X, Trash2, Pin, PinOff, Palette,
  GripVertical, Minimize2, Maximize2, Clock, Grid, List, Search
} from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../store/store';

interface QuickNote {
  id: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  minimized: boolean;
  position?: { x: number; y: number };
}

interface ScratchPadProps {
  mode?: 'panel' | 'floating' | 'overview';
}

const noteColors = [
  { id: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900', border: 'border-yellow-300 dark:border-yellow-700' },
  { id: 'green', bg: 'bg-green-100 dark:bg-green-900', border: 'border-green-300 dark:border-green-700' },
  { id: 'blue', bg: 'bg-blue-100 dark:bg-blue-900', border: 'border-blue-300 dark:border-blue-700' },
  { id: 'pink', bg: 'bg-pink-100 dark:bg-pink-900', border: 'border-pink-300 dark:border-pink-700' },
  { id: 'purple', bg: 'bg-purple-100 dark:bg-purple-900', border: 'border-purple-300 dark:border-purple-700' },
  { id: 'orange', bg: 'bg-orange-100 dark:bg-orange-900', border: 'border-orange-300 dark:border-orange-700' },
];

const STICKIES_FILENAME = '.notebook-stickies.json';

// Load notes from vault storage, falling back to localStorage for migration
const loadNotesFromVault = async (vaultPath: string | null): Promise<QuickNote[]> => {
  if (vaultPath) {
    try {
      const stickiesPath = `${vaultPath}/${STICKIES_FILENAME}`;
      const exists = await window.electronAPI.exists(stickiesPath);
      if (exists) {
        const content = await window.electronAPI.readTextFile(stickiesPath);
        if (content) {
          return JSON.parse(content);
        }
      }
    } catch (e) {
      // File doesn't exist yet, check localStorage for migration
    }
  }
  
  // Fallback to localStorage (for migration or if no vault)
  try {
    const saved = localStorage.getItem('scratch-pad-notes');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
};

// Save notes to vault storage
const saveNotesToVault = async (notes: QuickNote[], vaultPath: string | null): Promise<void> => {
  if (vaultPath) {
    try {
      const stickiesPath = `${vaultPath}/${STICKIES_FILENAME}`;
      await window.electronAPI.writeTextFile(stickiesPath, JSON.stringify(notes, null, 2));
      // Clear localStorage after successful vault save (migration complete)
      localStorage.removeItem('scratch-pad-notes');
    } catch (e) {
      console.error('Failed to save stickies to vault:', e);
      // Fallback to localStorage
      localStorage.setItem('scratch-pad-notes', JSON.stringify(notes));
    }
  } else {
    // No vault, use localStorage
    localStorage.setItem('scratch-pad-notes', JSON.stringify(notes));
  }
};

export const ScratchPad: React.FC<ScratchPadProps> = ({ mode = 'panel' }) => {
  const { currentPath } = useAppStore();
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Refresh handler for when FloatingQuickNote adds a note
  const refreshNotes = useCallback(() => {
    loadNotesFromVault(currentPath).then(loadedNotes => {
      setNotes(loadedNotes);
    });
  }, [currentPath]);
  
  // Load notes when vault changes
  useEffect(() => {
    loadNotesFromVault(currentPath).then(loadedNotes => {
      setNotes(loadedNotes);
      setIsLoaded(true);
    });
  }, [currentPath]);
  
  // Listen for refresh events from FloatingQuickNote
  useEffect(() => {
    window.addEventListener('scratchpad-refresh', refreshNotes);
    return () => window.removeEventListener('scratchpad-refresh', refreshNotes);
  }, [refreshNotes]);
  
  // Save notes when changed (debounced)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!isLoaded) return; // Don't save until initial load completes
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveNotesToVault(notes, currentPath);
    }, 500); // Debounce saves by 500ms
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notes, currentPath, isLoaded]);
  
  const addNote = () => {
    const newNote: QuickNote = {
      id: Date.now().toString(),
      content: '',
      color: 'yellow',
      pinned: true,
      position: { x: 150 + Math.random() * 200, y: 150 + Math.random() * 100 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      minimized: false,
    };
    setNotes([newNote, ...notes]);
    setActiveNote(newNote.id);
    // Dispatch event to show the new sticky
    setTimeout(() => window.dispatchEvent(new CustomEvent('stickies-refresh')), 50);
  };
  
  const updateNote = (id: string, updates: Partial<QuickNote>) => {
    setNotes(notes.map(n => 
      n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
    ));
  };
  
  const deleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
    if (activeNote === id) setActiveNote(null);
  };
  
  const togglePin = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      updateNote(id, { pinned: !note.pinned });
    }
  };
  
  const getColorClasses = (colorId: string) => {
    return noteColors.find(c => c.id === colorId) || noteColors[0];
  };
  
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt - a.updatedAt;
  });
  
  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote size={18} className="text-yellow-500" />
          <h2 className="font-semibold text-sm">Scratch Pad</h2>
          <span className="text-xs text-gray-400">({notes.length})</span>
        </div>
        <button
          onClick={addNote}
          className="p-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
          title="New Note"
        >
          <Plus size={16} />
        </button>
      </div>
      
      {/* Notes list */}
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {sortedNotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <StickyNote size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No quick notes yet</p>
            <button
              onClick={addNote}
              className="mt-2 text-yellow-500 hover:text-yellow-600 text-sm"
            >
              Create one
            </button>
          </div>
        ) : (
          sortedNotes.map(note => {
            const colors = getColorClasses(note.color);
            
            return (
              <div
                key={note.id}
                className={clsx(
                  "rounded-lg border transition-all",
                  colors.bg,
                  colors.border,
                  activeNote === note.id ? "ring-2 ring-blue-500" : "",
                  note.minimized ? "cursor-pointer" : ""
                )}
                onClick={() => note.minimized && updateNote(note.id, { minimized: false })}
              >
                {/* Note header */}
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePin(note.id); }}
                      className={clsx(
                        "p-1 rounded hover:bg-black/5 dark:hover:bg-white/5",
                        note.pinned ? "text-amber-500" : "text-gray-400"
                      )}
                      title={note.pinned ? "Unpin" : "Pin"}
                    >
                      {note.pinned ? <Pin size={12} /> : <PinOff size={12} />}
                    </button>
                    
                    {/* Color picker */}
                    <div className="relative">
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setShowColorPicker(showColorPicker === note.id ? null : note.id); 
                        }}
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-gray-400"
                        title="Change color"
                      >
                        <Palette size={12} />
                      </button>
                      
                      {showColorPicker === note.id && (
                        <div className="absolute top-full left-0 mt-1 p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 flex gap-1">
                          {noteColors.map(c => (
                            <button
                              key={c.id}
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                updateNote(note.id, { color: c.id }); 
                                setShowColorPicker(null); 
                              }}
                              className={clsx(
                                "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110",
                                c.bg,
                                note.color === c.id ? "border-gray-600 dark:border-gray-300" : "border-transparent"
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-0.5">
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5 mr-1">
                      <Clock size={10} />
                      {formatTimeAgo(note.updatedAt)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); updateNote(note.id, { minimized: !note.minimized }); }}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-gray-400"
                      title={note.minimized ? "Expand" : "Minimize"}
                    >
                      {note.minimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                
                {/* Note content */}
                {!note.minimized && (
                  <textarea
                    value={note.content}
                    onChange={(e) => updateNote(note.id, { content: e.target.value })}
                    onFocus={() => setActiveNote(note.id)}
                    placeholder="Write something..."
                    className="w-full p-2 bg-transparent resize-none text-sm focus:outline-none min-h-[80px]"
                    style={{ height: Math.max(80, note.content.split('\n').length * 20 + 20) }}
                  />
                )}
                
                {note.minimized && note.content && (
                  <div className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 truncate">
                    {note.content.split('\n')[0]}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Footer */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 text-center">
        {currentPath ? 'Quick notes are saved to your vault' : 'Open a vault to save notes'}
      </div>
    </div>
  );
};

// Floating quick note widget
interface FloatingQuickNoteProps {
  isOpen: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
}

export const FloatingQuickNote: React.FC<FloatingQuickNoteProps> = ({ isOpen, onClose, position }) => {
  const { currentPath } = useAppStore();
  const [content, setContent] = useState('');
  const [color, setColor] = useState('yellow');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  const handleSave = async () => {
    if (!content.trim()) {
      onClose();
      return;
    }
    
    const notes = await loadNotesFromVault(currentPath);
    const newNote: QuickNote = {
      id: Datetrue,
      position: { x: 150 + Math.random() * 200, y: 150 + Math.random() * 100 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      minimized: false,
    };
    await saveNotesToVault([newNote, ...notes], currentPath);
    // Trigger refresh in ScratchPad if it's open
    window.dispatchEvent(new CustomEvent('scratchpad-refresh'));
    window.dispatchEvent(new CustomEvent('stickies-refresh'));
    setContent('');
    onClose();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  const colors = getColorClasses(color);
  
  function getColorClasses(colorId: string) {
    return noteColors.find(c => c.id === colorId) || noteColors[0];
  }
  
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className={clsx(
          "w-80 rounded-xl border shadow-2xl",
          colors.bg,
          colors.border
        )}
        onClick={e => e.stopPropagation()}
        style={position ? { position: 'absolute', left: position.x, top: position.y } : {}}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2">
            <StickyNote size={16} className="text-yellow-600" />
            <span className="text-sm font-medium">Quick Note</span>
          </div>
          <div className="flex items-center gap-1">
            {noteColors.map(c => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                className={clsx(
                  "w-4 h-4 rounded-full border transition-transform hover:scale-110",
                  c.bg,
                  color === c.id ? "border-gray-600 dark:border-gray-300 scale-110" : "border-transparent"
                )}
              />
            ))}
          </div>
        </div>
        
        <textarea
          ref={inputRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a quick note..."
          className="w-full p-3 bg-transparent resize-none focus:outline-none min-h-[120px] text-sm"
        />
        
        <div className="flex items-center justify-between px-3 py-2 border-t border-black/5 dark:border-white/5">
          <span className="text-xs text-gray-400">⌘+Enter to save</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs rounded hover:bg-black/5 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stickies Overview - Grid view of all stickies
export const StickiesOverview: React.FC = () => {
  const { currentPath } = useAppStore();
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNote, setEditingNote] = useState<QuickNote | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  
  // Load notes
  useEffect(() => {
    loadNotesFromVault(currentPath).then(setNotes);
    
    const refreshHandler = () => {
      loadNotesFromVault(currentPath).then(setNotes);
    };
    window.addEventListener('scratchpad-refresh', refreshHandler);
    return () => window.removeEventListener('scratchpad-refresh', refreshHandler);
  }, [currentPath]);
  
  const addNote = async (floating = true) => {
    const newNote: QuickNote = {
      id: Date.now().toString(),
      content: '',
      color: 'yellow',
      pinned: floating, // New notes are floating/pinned by default
      createdAt: Date.now(),
      updatedAt: Date.now(),
      minimized: false,
      position: floating ? { x: 150 + Math.random() * 200, y: 150 + Math.random() * 100 } : undefined,
    };
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    await saveNotesToVault(updatedNotes, currentPath);
    // Dispatch refresh for floating stickies if created as floating
    if (floating) {
      window.dispatchEvent(new CustomEvent('stickies-refresh'));
    } else {
      setEditingNote(newNote);
    }
  };
  
  const updateNote = async (id: string, updates: Partial<QuickNote>) => {
    const updatedNotes = notes.map(n => 
      n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
    );
    setNotes(updatedNotes);
    await saveNotesToVault(updatedNotes, currentPath);
    // Notify persistent stickies if pinned status changed
    if ('pinned' in updates || 'position' in updates) {
      window.dispatchEvent(new CustomEvent('stickies-refresh'));
    }
  };
  
  // Pin to screen with position
  const pinToScreen = async (id: string) => {
    const updatedNotes = notes.map(n => 
      n.id === id ? { 
        ...n, 
        pinned: true, 
        position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 100 },
        updatedAt: Date.now() 
      } : n
    );
    setNotes(updatedNotes);
    await saveNotesToVault(updatedNotes, currentPath);
    window.dispatchEvent(new CustomEvent('stickies-refresh'));
  };
  
  const deleteNote = async (id: string) => {
    const updatedNotes = notes.filter(n => n.id !== id);
    setNotes(updatedNotes);
    await saveNotesToVault(updatedNotes, currentPath);
    if (editingNote?.id === id) setEditingNote(null);
  };
  
  const getColorClasses = (colorId: string) => {
    return noteColors.find(c => c.id === colorId) || noteColors[0];
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };
  
  // Filter and sort notes
  const filteredNotes = notes
    .filter(n => n.content.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StickyNote size={22} className="text-yellow-500" />
            <h2 className="text-lg font-semibold">All Stickies</h2>
            <span className="text-sm text-gray-400">({notes.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
            >
              {viewMode === 'grid' ? <List size={18} /> : <Grid size={18} />}
            </button>
            <button
              onClick={addNote}
              className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
              title="New Sticky"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stickies..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
          />
        </div>
      </div>
      
      {/* Notes grid/list */}
      <div className="flex-1 overflow-auto p-4">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <StickyNote size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium mb-1">
              {searchQuery ? 'No stickies match your search' : 'No stickies yet'}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              {searchQuery ? 'Try a different search term' : 'Create your first sticky note to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => addNote(true)}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm"
              >
                Create Sticky
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredNotes.map(note => {
              const colors = getColorClasses(note.color);
              return (
                <div
                  key={note.id}
                  className={clsx(
                    "rounded-xl border p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] relative group",
                    colors.bg,
                    colors.border
                  )}
                  onClick={() => setEditingNote(note)}
                >
                  {/* Pin indicator */}
                  {note.pinned && (
                    <Pin size={14} className="absolute top-2 right-2 text-amber-500" />
                  )}
                  
                  {/* Content preview */}
                  <div className="h-24 overflow-hidden text-sm mb-3">
                    {note.content || <span className="italic text-gray-400">Empty note</span>}
                  </div>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(note.updatedAt)}
                    </span>
                  </div>
                  
                  {/* Hover actions */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    {!note.position && (
                      <button
                        onClick={(e) => { e.stopPropagation(); pinToScreen(note.id); }}
                        className="p-1.5 rounded bg-white/90 dark:bg-gray-900/90 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600"
                        title="Pin to screen (floating)"
                      >
                        <Maximize2 size={12} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                      className="p-1.5 rounded bg-white/90 dark:bg-gray-900/90 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotes.map(note => {
              const colors = getColorClasses(note.color);
              return (
                <div
                  key={note.id}
                  className={clsx(
                    "rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md flex items-start gap-3 group",
                    colors.bg,
                    colors.border
                  )}
                  onClick={() => setEditingNote(note)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {note.pinned && <Pin size={12} className="text-amber-500" />}
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={10} />
                        {formatDate(note.updatedAt)}
                      </span>
                    </div>
                    <p className="text-sm truncate">
                      {note.content || <span className="italic text-gray-400">Empty note</span>}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); updateNote(note.id, { pinned: !note.pinned }); }}
                      className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
                      title={note.pinned ? "Unpin" : "Pin"}
                    >
                      {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                      className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Edit modal */}
      {editingNote && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setEditingNote(null)}
        >
          <div
            className={clsx(
              "w-[500px] max-w-[90vw] max-h-[80vh] rounded-xl border shadow-2xl flex flex-col",
              getColorClasses(editingNote.color).bg,
              getColorClasses(editingNote.color).border
            )}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateNote(editingNote.id, { pinned: !editingNote.pinned })}
                  className={clsx(
                    "p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5",
                    editingNote.pinned ? "text-amber-500" : "text-gray-400"
                  )}
                  title={editingNote.pinned ? "Unpin" : "Pin"}
                >
                  {editingNote.pinned ? <Pin size={16} /> : <PinOff size={16} />}
                </button>
                
                {/* Color picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowColorPicker(showColorPicker ? null : editingNote.id)}
                    className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 text-gray-400"
                    title="Change color"
                  >
                    <Palette size={16} />
                  </button>
                  
                  {showColorPicker && (
                    <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 flex gap-1">
                      {noteColors.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { 
                            updateNote(editingNote.id, { color: c.id }); 
                            setEditingNote({ ...editingNote, color: c.id });
                            setShowColorPicker(null); 
                          }}
                          className={clsx(
                            "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                            c.bg,
                            editingNote.color === c.id ? "border-gray-600 dark:border-gray-300" : "border-transparent"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  Last edited {formatDate(editingNote.updatedAt)}
                </span>
                <button
                  onClick={() => deleteNote(editingNote.id)}
                  className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setEditingNote(null)}
                  className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 text-gray-400"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            
            {/* Modal content */}
            <textarea
              value={editingNote.content}
              onChange={(e) => {
                const updated = { ...editingNote, content: e.target.value };
                setEditingNote(updated);
                updateNote(editingNote.id, { content: e.target.value });
              }}
              placeholder="Write your note..."
              className="flex-1 p-4 bg-transparent resize-none focus:outline-none text-sm min-h-[200px]"
              autoFocus
            />
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 text-center">
        {currentPath ? 'Stickies are saved to your vault' : 'Open a vault to save stickies'}
      </div>
    </div>
  );
};

// Persistent floating stickies that stay on screen
export const PersistentStickies: React.FC = () => {
  const { currentPath } = useAppStore();
  const [pinnedNotes, setPinnedNotes] = useState<QuickNote[]>([]);
  const [dragState, setDragState] = useState<{ id: string; startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
  
  // Load pinned notes
  useEffect(() => {
    const loadPinned = async () => {
      const notes = await loadNotesFromVault(currentPath);
      setPinnedNotes(notes.filter(n => n.pinned && n.position));
    };
    loadPinned();
    
    const handleRefresh = () => loadPinned();
    window.addEventListener('scratchpad-refresh', handleRefresh);
    window.addEventListener('stickies-refresh', handleRefresh);
    return () => {
      window.removeEventListener('scratchpad-refresh', handleRefresh);
      window.removeEventListener('stickies-refresh', handleRefresh);
    };
  }, [currentPath]);
  
  const handleMouseDown = (e: React.MouseEvent, noteId: string) => {
    const note = pinnedNotes.find(n => n.id === noteId);
    if (!note?.position) return;
    
    setDragState({
      id: noteId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: note.position.x,
      offsetY: note.position.y,
    });
  };
  
  useEffect(() => {
    if (!dragState) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newX = dragState.offsetX + (e.clientX - dragState.startX);
      const newY = dragState.offsetY + (e.clientY - dragState.startY);
      
      setPinnedNotes(prev => prev.map(n =>
        n.id === dragState.id ? { ...n, position: { x: Math.max(0, newX), y: Math.max(0, newY) } } : n
      ));
    };
    
    const handleMouseUp = async () => {
      if (!dragState) return;
      
      // Save the new position
      const notes = await loadNotesFromVault(currentPath);
      const note = pinnedNotes.find(n => n.id === dragState.id);
      if (note?.position) {
        const updatedNotes = notes.map(n =>
          n.id === dragState.id ? { ...n, position: note.position } : n
        );
        await saveNotesToVault(updatedNotes, currentPath);
      }
      
      setDragState(null);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, currentPath, pinnedNotes]);
  
  const handleUnpin = async (noteId: string) => {
    // Move from floating to panel view (keep note, just remove from floating)
    const notes = await loadNotesFromVault(currentPath);
    const updatedNotes = notes.map(n =>
      n.id === noteId ? { ...n, pinned: false, position: undefined } : n
    );
    await saveNotesToVault(updatedNotes, currentPath);
    setPinnedNotes(prev => prev.filter(n => n.id !== noteId));
    window.dispatchEvent(new CustomEvent('scratchpad-refresh'));
  };
  
  const handleClose = async (noteId: string) => {
    // Close the floating sticky - remove from screen but keep in overview
    const notes = await loadNotesFromVault(currentPath);
    const updatedNotes = notes.map(n =>
      n.id === noteId ? { ...n, pinned: false, position: undefined } : n
    );
    await saveNotesToVault(updatedNotes, currentPath);
    setPinnedNotes(prev => prev.filter(n => n.id !== noteId));
    window.dispatchEvent(new CustomEvent('scratchpad-refresh'));
  };
  
  // Debounce ref for content saves
  const contentSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleContentChange = (noteId: string, newContent: string) => {
    // Update local state immediately
    setPinnedNotes(prev => prev.map(n =>
      n.id === noteId ? { ...n, content: newContent, updatedAt: Date.now() } : n
    ));
    
    // Debounce save to vault
    if (contentSaveTimeoutRef.current) {
      clearTimeout(contentSaveTimeoutRef.current);
    }
    contentSaveTimeoutRef.current = setTimeout(async () => {
      const notes = await loadNotesFromVault(currentPath);
      const updatedNotes = notes.map(n =>
        n.id === noteId ? { ...n, content: newContent, updatedAt: Date.now() } : n
      );
      await saveNotesToVault(updatedNotes, currentPath);
      window.dispatchEvent(new CustomEvent('scratchpad-refresh'));
    }, 500);
  };
  
  const getColorClasses = (colorId: string) => {
    return noteColors.find(c => c.id === colorId) || noteColors[0];
  };
  
  if (pinnedNotes.length === 0) return null;
  
  return (
    <>
      {pinnedNotes.map(note => {
        const colors = getColorClasses(note.color);
        return (
          <div
            key={note.id}
            className={clsx(
              "fixed z-[9000] w-64 rounded-lg border shadow-lg",
              colors.bg,
              colors.border,
              dragState?.id === note.id && "cursor-grabbing shadow-2xl"
            )}
            style={{
              left: note.position?.x || 100,
              top: note.position?.y || 100,
            }}
          >
            {/* Header - draggable */}
            <div
              className="flex items-center justify-between px-2 py-1.5 border-b border-black/10 dark:border-white/10 cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => handleMouseDown(e, note.id)}
            >
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <GripVertical size={12} />
                <StickyNote size={12} />
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => handleUnpin(note.id)}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-amber-500"
                  title="Move to panel"
                >
                  <Minimize2 size={12} />
                </button>
                <button
                  onClick={() => handleClose(note.id)}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600"
                  title="Close (move to panel)"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
            
            {/* Content - editable */}
            <textarea
              value={note.content}
              onChange={(e) => handleContentChange(note.id, e.target.value)}
              placeholder="Write something..."
              className="w-full p-2 text-sm bg-transparent resize-none focus:outline-none min-h-[80px] max-h-48"
            />
          </div>
        );
      })}
    </>
  );
};

export default ScratchPad;

import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['⌘', 'S'], description: 'Save all unsaved changes' },
      { keys: ['⌘', 'O'], description: 'Quick file switcher' },
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['⌘', '/'], description: 'Toggle search' },
      { keys: ['⌘', '?'], description: 'Show keyboard shortcuts' },
      { keys: ['⌘', 'N'], description: 'Create new note' },
      { keys: ['⌘', 'Shift', 'N'], description: 'Quick note (sticky)' },
    ]
  },
  {
    title: 'Editor',
    shortcuts: [
      { keys: ['⌘', 'B'], description: 'Bold text' },
      { keys: ['⌘', 'I'], description: 'Italic text' },
      { keys: ['⌘', 'U'], description: 'Underline text' },
      { keys: ['⌘', 'Shift', 'K'], description: 'Strikethrough' },
      { keys: ['⌘', 'E'], description: 'Inline code' },
      { keys: ['⌘', 'L'], description: 'Insert link' },
      { keys: ['⌘', 'Shift', 'X'], description: 'Toggle checkbox' },
      { keys: ['Tab'], description: 'Indent / autocomplete' },
      { keys: ['Shift', 'Tab'], description: 'Outdent' },
    ]
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['⌘', 'P'], description: 'Quick switcher' },
      { keys: ['⌘', 'Shift', 'F'], description: 'Global search' },
      { keys: ['⌘', 'G'], description: 'Open graph view' },
      { keys: ['⌘', '\\'], description: 'Toggle sidebar' },
      { keys: ['⌘', 'W'], description: 'Close current tab' },
      { keys: ['⌘', 'Tab'], description: 'Next tab' },
      { keys: ['⌘', 'Shift', 'Tab'], description: 'Previous tab' },
    ]
  },
  {
    title: 'Productivity',
    shortcuts: [
      { keys: ['⌘', 'T'], description: 'Open tasks panel' },
      { keys: ['⌘', 'Shift', 'C'], description: 'Open calendar' },
      { keys: ['⌘', 'Shift', 'I'], description: 'Open insights' },
      { keys: ['⌘', 'Shift', 'W'], description: 'Open whiteboard' },
      { keys: ['⌘', 'Shift', 'D'], description: 'Create daily note' },
      { keys: ['⌘', 'Shift', 'P'], description: 'Focus mode / Pomodoro' },
    ]
  },
  {
    title: 'AI Copilot',
    shortcuts: [
      { keys: ['⌘', 'Shift', 'A'], description: 'Open AI Copilot' },
      { keys: ['Enter'], description: 'Send message' },
      { keys: ['Shift', 'Enter'], description: 'New line in message' },
    ]
  },
];

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-[700px] max-h-[80vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Keyboard size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
              <p className="text-sm text-gray-500">Quick reference for common actions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div className="grid grid-cols-2 gap-6">
            {shortcutGroups.map((group, i) => (
              <div key={i} className="space-y-3">
                <h3 className="font-medium text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, j) => (
                    <div 
                      key={j} 
                      className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, k) => (
                          <kbd 
                            key={k}
                            className="min-w-[24px] h-6 px-1.5 flex items-center justify-center bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">⌘</kbd> + <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
};

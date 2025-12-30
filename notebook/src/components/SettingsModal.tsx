import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { useAppStore, AIProvider } from '../store/store';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PROVIDERS = [
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
  { name: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash' },
  { name: 'Perplexity', baseUrl: 'https://api.perplexity.ai', model: 'sonar-pro' },
  { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o' },
  { name: 'Ollama', baseUrl: 'http://localhost:11434/v1', model: 'llama3' },
  { name: 'Custom', baseUrl: '', model: '' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    theme, setTheme, 
    aiProviders, addAIProvider, removeAIProvider, updateAIProvider, selectedAIProvider, setSelectedAIProvider,
    autosaveEnabled, setAutosaveEnabled, autosaveInterval, setAutosaveInterval,
    versionHistoryEnabled, setVersionHistoryEnabled, maxVersionsPerFile, setMaxVersionsPerFile
  } = useAppStore();
  const { toolExecutionMode, setToolExecutionMode } = useAppStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: 'OpenAI', apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' });
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ apiKey: string; model: string; baseUrl: string }>({ apiKey: '', model: '', baseUrl: '' });

  const handleAddProvider = () => {
    if (!newProvider.apiKey.trim()) {
      alert('Please enter an API key');
      return;
    }
    addAIProvider({
      id: uuidv4(),
      name: newProvider.name,
      apiKey: newProvider.apiKey,
      baseUrl: newProvider.baseUrl,
      model: newProvider.model,
    });
    setNewProvider({ name: 'OpenAI', apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' });
    setShowAddForm(false);
  };

  const handlePresetChange = (presetName: string) => {
    const preset = DEFAULT_PROVIDERS.find(p => p.name === presetName);
    if (preset) {
      setNewProvider({
        ...newProvider,
        name: preset.name,
        baseUrl: preset.baseUrl,
        model: preset.model,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Theme Setting */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Theme
          </label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'obsidian' | 'light' | 'dark')}
            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
          >
            <option value="obsidian">Obsidian</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        {/* Autosave Settings */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Autosave</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600 dark:text-gray-400">Enable autosave</label>
              <button
                onClick={() => setAutosaveEnabled(!autosaveEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autosaveEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autosaveEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {autosaveEnabled && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Autosave interval</label>
                <select
                  value={autosaveInterval}
                  onChange={(e) => setAutosaveInterval(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                >
                  <option value={10}>10 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={120}>2 minutes</option>
                  <option value={300}>5 minutes</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Version History Settings */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Version History</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600 dark:text-gray-400">Enable version history</label>
              <button
                onClick={() => setVersionHistoryEnabled(!versionHistoryEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  versionHistoryEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    versionHistoryEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {versionHistoryEnabled && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max versions per file</label>
                <select
                  value={maxVersionsPerFile}
                  onChange={(e) => setMaxVersionsPerFile(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                >
                  <option value={5}>5 versions</option>
                  <option value={10}>10 versions</option>
                  <option value={20}>20 versions</option>
                  <option value={50}>50 versions</option>
                  <option value={100}>100 versions</option>
                </select>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Access version history via right-click menu on files or View → Version History.
            </p>
          </div>
        </div>

        {/* Tool Execution Settings */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">AI Tool Execution</h3>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600 dark:text-gray-400">Allow AI tools to run without permission</label>
            <button
              onClick={() => setToolExecutionMode(toolExecutionMode === 'ask' ? 'allow_all' : 'ask')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                toolExecutionMode === 'allow_all' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  toolExecutionMode === 'allow_all' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">When enabled, the assistant may call tools (read/write/fetch) without prompting. Otherwise, you'll be asked each time, with options to allow once or for the session.</p>
        </div>

        {/* AI Providers Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Providers</h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
            >
              <Plus size={14} />
              Add Provider
            </button>
          </div>

          {/* Add Provider Form */}
          {showAddForm && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Provider Type</label>
                <select
                  value={newProvider.name}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                >
                  {DEFAULT_PROVIDERS.map(p => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">API Key</label>
                <input
                  type="password"
                  value={newProvider.apiKey}
                  onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Base URL</label>
                <input
                  type="text"
                  value={newProvider.baseUrl}
                  onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Model</label>
                <input
                  type="text"
                  value={newProvider.model}
                  onChange={(e) => setNewProvider({ ...newProvider, model: e.target.value })}
                  placeholder="gpt-4o"
                  className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddProvider}
                  className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Provider List */}
          {aiProviders.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
              No AI providers configured. Add one to enable the Copilot feature.
            </p>
          ) : (
            <div className="space-y-2">
              {aiProviders.map((provider) => (
                <div
                  key={provider.id}
                  className={`p-3 rounded-lg border ${
                    selectedAIProvider === provider.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="selectedProvider"
                        checked={selectedAIProvider === provider.id}
                        onChange={() => setSelectedAIProvider(provider.id)}
                        className="text-blue-500"
                      />
                      <span className="font-medium text-sm">{provider.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          // start editing
                          setEditingProvider(provider.id);
                          setEditValues({ apiKey: provider.apiKey || '', model: provider.model || '', baseUrl: provider.baseUrl || '' });
                        }}
                        className="text-xs text-blue-500 hover:text-blue-600 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeAIProvider(provider.id)}
                        className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    {editingProvider === provider.id ? (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">API Key</label>
                          <input
                            type="text"
                            value={editValues.apiKey}
                            onChange={(e) => setEditValues({ ...editValues, apiKey: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Model</label>
                          <input
                            type="text"
                            value={editValues.model}
                            onChange={(e) => setEditValues({ ...editValues, model: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Base URL</label>
                          <input
                            type="text"
                            value={editValues.baseUrl}
                            onChange={(e) => setEditValues({ ...editValues, baseUrl: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              updateAIProvider(provider.id, { apiKey: editValues.apiKey, model: editValues.model, baseUrl: editValues.baseUrl });
                              setEditingProvider(null);
                            }}
                            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingProvider(null)}
                            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span>API Key:</span>
                          <span className="font-mono">
                            {showApiKeys[provider.id] ? provider.apiKey : '••••••••••••'}
                          </span>
                          <button
                            onClick={() => setShowApiKeys({ ...showApiKeys, [provider.id]: !showApiKeys[provider.id] })}
                            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          >
                            {showApiKeys[provider.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>
                        <div>Model: {provider.model}</div>
                        <div className="truncate">URL: {provider.baseUrl}</div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Version Info */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Notebook App v0.1.0
          </p>
        </div>
      </div>
    </Modal>
  );
};

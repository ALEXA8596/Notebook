import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from './ui/Modal';
import { useAppStore, AIProvider } from '../store/store';
import { Plus, Trash2, Eye, EyeOff, RefreshCw, Folder, ExternalLink, Settings, Shield, Palette } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
  initAddonSystem,
  getPluginManager,
  getThemeManager,
  PluginManager,
  ThemeManager,
  AddonMeta,
  PermissionLevel,
  PluginSettingDef,
} from '../lib/addonManager';

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
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'plugins' | 'themes'>('general');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: 'OpenAI', apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' });
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ apiKey: string; model: string; baseUrl: string }>({ apiKey: '', model: '', baseUrl: '' });

  // Addon system state
  const [pluginManager, setPluginManager] = useState<PluginManager | null>(null);
  const [themeManager, setThemeManager] = useState<ThemeManager | null>(null);
  const [plugins, setPlugins] = useState<AddonMeta[]>([]);
  const [themes, setThemes] = useState<AddonMeta[]>([]);
  const [addonRefreshKey, setAddonRefreshKey] = useState(0);
  const [expandedPluginSettings, setExpandedPluginSettings] = useState<string | null>(null);
  const [expandedThemeVars, setExpandedThemeVars] = useState<string | null>(null);

  // Initialize addon system
  useEffect(() => {
    if (isOpen && (activeTab === 'plugins' || activeTab === 'themes')) {
      initAddonSystem().then(({ pluginManager: pm, themeManager: tm }) => {
        setPluginManager(pm);
        setThemeManager(tm);
        pm.setOnReload(() => setAddonRefreshKey((k) => k + 1));
        tm.setOnReload(() => setAddonRefreshKey((k) => k + 1));
      });
    }
  }, [isOpen, activeTab]);

  // Load addon lists
  useEffect(() => {
    if (isOpen && (activeTab === 'plugins' || activeTab === 'themes')) {
      window.electronAPI.addons.listPlugins().then(setPlugins);
      window.electronAPI.addons.listThemes().then(setThemes);
    }
  }, [isOpen, activeTab, addonRefreshKey]);

  // Hot reload listeners
  useEffect(() => {
    if (!isOpen) return;
    const handlePluginChange = () => {
      window.electronAPI.addons.listPlugins().then(setPlugins);
      setAddonRefreshKey((k) => k + 1);
    };
    const handleThemeChange = () => {
      window.electronAPI.addons.listThemes().then(setThemes);
      setAddonRefreshKey((k) => k + 1);
    };
    window.electronAPI.addons.onPluginChanged(handlePluginChange);
    window.electronAPI.addons.onThemeChanged(handleThemeChange);
  }, [isOpen]);

  const refreshAddons = useCallback(async () => {
    const [p, t] = await Promise.all([
      window.electronAPI.addons.listPlugins(),
      window.electronAPI.addons.listThemes(),
    ]);
    setPlugins(p);
    setThemes(t);
    setAddonRefreshKey((k) => k + 1);
  }, []);

  const handleUploadPlugin = async () => {
    const filePath = await window.electronAPI.openFile({ filters: [{ name: 'Plugin', extensions: ['js'] }] });
    if (filePath) {
      await window.electronAPI.addons.uploadPlugin(filePath);
      await refreshAddons();
    }
  };

  const handleUploadTheme = async () => {
    const filePath = await window.electronAPI.openFile({ filters: [{ name: 'Theme', extensions: ['css'] }] });
    if (filePath) {
      await window.electronAPI.addons.uploadTheme(filePath);
      await refreshAddons();
    }
  };

  const handleDeleteAddon = async (filePath: string) => {
    if (confirm('Are you sure you want to delete this addon?')) {
      await window.electronAPI.addons.delete(filePath);
      await refreshAddons();
    }
  };

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
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        {(['general', 'ai', 'plugins', 'themes'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab === 'ai' ? 'AI Providers' : tab}
          </button>
        ))}
      </div>

      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* ==================== GENERAL TAB ==================== */}
        {activeTab === 'general' && (
          <>
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">When enabled, the assistant may call tools (read/write/fetch) without prompting.</p>
            </div>

            {/* Version Info */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Notebook App v0.1.0
              </p>
            </div>
          </>
        )}

        {/* ==================== AI PROVIDERS TAB ==================== */}
        {activeTab === 'ai' && (
          <>
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
          </>
        )}

        {/* ==================== PLUGINS TAB ==================== */}
        {activeTab === 'plugins' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Plugins</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refreshAddons()}
                  className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  title="Refresh"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={() => window.electronAPI.addons.openFolder('plugins')}
                  className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  title="Open Plugins Folder"
                >
                  <Folder size={14} />
                </button>
                <button
                  onClick={handleUploadPlugin}
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
                >
                  <Plus size={14} />
                  Install Plugin
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Plugins extend functionality with JavaScript. Files must be named <code>*.plugin.js</code>.
            </p>

            {plugins.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-8">
                No plugins installed. Click "Install Plugin" to add one.
              </p>
            ) : (
              <div className="space-y-2">
                {plugins.map((plugin) => {
                  const isEnabled = pluginManager?.isEnabled(plugin.id) || false;
                  const permission = pluginManager?.getPermission(plugin.id) || 'limited';
                  const instance = pluginManager?.getPlugin(plugin.id);
                  const hasSettings = instance?.exports?.getSettingsPanel || (instance?.exports?.settings && instance.exports.settings.length > 0);

                  return (
                    <div
                      key={plugin.id}
                      className={`p-3 rounded-lg border ${
                        isEnabled
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{plugin.name}</span>
                          <span className="text-xs text-gray-400">v{plugin.version}</span>
                          {instance?.error && (
                            <span className="text-xs text-red-500" title={instance.error}>⚠️ Error</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Reload button */}
                          <button
                            onClick={() => pluginManager?.reloadPlugin(plugin.id)}
                            className="p-1 text-gray-500 hover:text-blue-500 rounded"
                            title="Reload Plugin"
                          >
                            <RefreshCw size={12} />
                          </button>
                          {/* Settings button */}
                          {hasSettings && (
                            <button
                              onClick={() => setExpandedPluginSettings(expandedPluginSettings === plugin.id ? null : plugin.id)}
                              className="p-1 text-gray-500 hover:text-blue-500 rounded"
                              title="Plugin Settings"
                            >
                              <Settings size={12} />
                            </button>
                          )}
                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteAddon(plugin.filePath)}
                            className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          >
                            <Trash2 size={12} />
                          </button>
                          {/* Enable/Disable toggle */}
                          <button
                            onClick={() => {
                              if (isEnabled) {
                                pluginManager?.stopPlugin(plugin.id);
                              } else {
                                pluginManager?.startPlugin(plugin.id);
                              }
                              setAddonRefreshKey((k) => k + 1);
                            }}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                isEnabled ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 space-y-1">
                        <div>{plugin.description}</div>
                        <div className="flex items-center gap-3">
                          <span>by {plugin.author}</span>
                          {plugin.website && (
                            <a href={plugin.website} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                              Website <ExternalLink size={10} />
                            </a>
                          )}
                          {plugin.source && (
                            <a href={plugin.source} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                              Source <ExternalLink size={10} />
                            </a>
                          )}
                        </div>

                        {/* Permission selector */}
                        <div className="flex items-center gap-2 mt-2">
                          <Shield size={12} className="text-gray-400" />
                          <span className="text-xs">Access:</span>
                          <select
                            value={permission}
                            onChange={(e) => {
                              pluginManager?.setPermission(plugin.id, e.target.value as PermissionLevel);
                              setAddonRefreshKey((k) => k + 1);
                            }}
                            className="text-xs px-2 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                          >
                            <option value="limited">Limited (Data/UI only)</option>
                            <option value="partial">Partial (+ DOM access)</option>
                            <option value="full">Full (+ React, Plugin API)</option>
                          </select>
                        </div>
                      </div>

                      {/* Plugin Settings Panel */}
                      {expandedPluginSettings === plugin.id && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <PluginSettingsPanel pluginManager={pluginManager} pluginId={plugin.id} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ==================== THEMES TAB ==================== */}
        {activeTab === 'themes' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Themes</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refreshAddons()}
                  className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  title="Refresh"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={() => window.electronAPI.addons.openFolder('themes')}
                  className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  title="Open Themes Folder"
                >
                  <Folder size={14} />
                </button>
                <button
                  onClick={handleUploadTheme}
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
                >
                  <Plus size={14} />
                  Install Theme
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Themes customize appearance with CSS. Files must be named <code>*.theme.css</code>. Use <code>@cssvar</code> in JSDoc to expose customizable variables.
            </p>

            {themes.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-8">
                No themes installed. Click "Install Theme" to add one.
              </p>
            ) : (
              <div className="space-y-2">
                {themes.map((thm) => {
                  const isEnabled = themeManager?.isEnabled(thm.id) || false;
                  const cssVars = themeManager?.getCSSVariables(thm.id) || [];

                  return (
                    <div
                      key={thm.id}
                      className={`p-3 rounded-lg border ${
                        isEnabled
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{thm.name}</span>
                          <span className="text-xs text-gray-400">v{thm.version}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Reload */}
                          <button
                            onClick={() => themeManager?.reloadTheme(thm.id)}
                            className="p-1 text-gray-500 hover:text-blue-500 rounded"
                            title="Reload Theme"
                          >
                            <RefreshCw size={12} />
                          </button>
                          {/* CSS Variables */}
                          {cssVars.length > 0 && (
                            <button
                              onClick={() => setExpandedThemeVars(expandedThemeVars === thm.id ? null : thm.id)}
                              className="p-1 text-gray-500 hover:text-blue-500 rounded"
                              title="Theme Variables"
                            >
                              <Palette size={12} />
                            </button>
                          )}
                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteAddon(thm.filePath)}
                            className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          >
                            <Trash2 size={12} />
                          </button>
                          {/* Enable/Disable */}
                          <button
                            onClick={async () => {
                              if (isEnabled) {
                                themeManager?.disableTheme(thm.id);
                              } else {
                                await themeManager?.enableTheme(thm.id);
                              }
                              setAddonRefreshKey((k) => k + 1);
                            }}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              isEnabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                isEnabled ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 space-y-1">
                        <div>{thm.description}</div>
                        <div className="flex items-center gap-3">
                          <span>by {thm.author}</span>
                          {thm.website && (
                            <a href={thm.website} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                              Website <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* CSS Variable customization */}
                      {expandedThemeVars === thm.id && cssVars.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 space-y-2">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-300">CSS Variables</div>
                          {cssVars.map((v) => (
                            <div key={v.name} className="flex items-center gap-2">
                              <label className="text-xs text-gray-500 w-32 truncate" title={v.name}>{v.name}</label>
                              <input
                                type="text"
                                value={v.value}
                                onChange={(e) => {
                                  themeManager?.setCSSVariable(thm.id, v.name, e.target.value);
                                  setAddonRefreshKey((k) => k + 1);
                                }}
                                className="flex-1 px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                              />
                              {v.description && (
                                <span className="text-xs text-gray-400" title={v.description}>?</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

// Plugin Settings Panel Component
const PluginSettingsPanel: React.FC<{ pluginManager: PluginManager | null; pluginId: string }> = ({ pluginManager, pluginId }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  if (!pluginManager) return null;

  const settingsDef = pluginManager.getSettingsDef(pluginId);

  // If plugin has getSettingsPanel, render that (React or HTMLElement)
  const instance = pluginManager.getPlugin(pluginId);
  if (instance?.exports?.getSettingsPanel) {
    // For now, just show a placeholder - complex React/HTML injection needs more work
    return (
      <div className="text-xs text-gray-500">
        Plugin provides custom settings panel. (Advanced rendering coming soon)
      </div>
    );
  }

  if (settingsDef.length === 0) {
    return <div className="text-xs text-gray-500">No settings available.</div>;
  }

  return (
    <div className="space-y-3" key={refreshKey}>
      {settingsDef.map((setting) => {
        const value = pluginManager.getPluginSetting(pluginId, setting.id) ?? setting.default;

        return (
          <div key={setting.id} className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium">{setting.name}</div>
              {setting.description && <div className="text-xs text-gray-400">{setting.description}</div>}
            </div>
            <div>
              {setting.type === 'switch' && (
                <button
                  onClick={() => {
                    pluginManager.setPluginSetting(pluginId, setting.id, !value);
                    setRefreshKey((k) => k + 1);
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    value ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              )}
              {setting.type === 'text' && (
                <input
                  type="text"
                  value={String(value || '')}
                  onChange={(e) => {
                    pluginManager.setPluginSetting(pluginId, setting.id, e.target.value);
                    setRefreshKey((k) => k + 1);
                  }}
                  className="px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded w-32"
                />
              )}
              {setting.type === 'number' && (
                <input
                  type="number"
                  value={Number(value || 0)}
                  onChange={(e) => {
                    pluginManager.setPluginSetting(pluginId, setting.id, Number(e.target.value));
                    setRefreshKey((k) => k + 1);
                  }}
                  className="px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded w-20"
                />
              )}
              {setting.type === 'color' && (
                <input
                  type="color"
                  value={String(value || '#000000')}
                  onChange={(e) => {
                    pluginManager.setPluginSetting(pluginId, setting.id, e.target.value);
                    setRefreshKey((k) => k + 1);
                  }}
                  className="w-8 h-6 rounded border-0"
                />
              )}
              {setting.type === 'dropdown' && setting.options && (
                <select
                  value={String(value)}
                  onChange={(e) => {
                    pluginManager.setPluginSetting(pluginId, setting.id, e.target.value);
                    setRefreshKey((k) => k + 1);
                  }}
                  className="px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                >
                  {setting.options.map((opt) => (
                    <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

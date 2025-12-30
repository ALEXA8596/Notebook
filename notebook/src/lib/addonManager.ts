/**
 * Addon Manager - Plugin & Theme System
 * Inspired by BetterDiscord's addon architecture
 */

import React from 'react';
import ReactDOM from 'react-dom/client';

// ==========================================
// Types
// ==========================================

export interface AddonMeta {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  source?: string;
  website?: string;
  filePath: string;
  type: 'plugin' | 'theme';
  cssVariables?: Array<{ name: string; default: string; description?: string }>;
}

export interface PluginSettingDef {
  id: string;
  name: string;
  type: 'switch' | 'text' | 'number' | 'dropdown' | 'color';
  default: unknown;
  description?: string;
  options?: Array<{ label: string; value: unknown }>; // for dropdown
}

export interface PluginInstance {
  meta: AddonMeta;
  exports: PluginExports;
  started: boolean;
  error?: string;
}

export interface PluginExports {
  start?: () => void;
  stop?: () => void;
  getSettingsPanel?: () => HTMLElement | React.ReactNode;
  settings?: PluginSettingDef[];
}

export type PermissionLevel = 'limited' | 'partial' | 'full';

export interface AddonState {
  enabledPlugins: string[];
  enabledThemes: string[];
  pluginPermissions: Record<string, PermissionLevel>;
  pluginSettings: Record<string, Record<string, unknown>>;
  themeVariables: Record<string, Record<string, string>>; // themeId -> varName -> value
}

// ==========================================
// NotebookAPI - Exposed to Plugins
// ==========================================

class DataAPI {
  private pluginId: string;
  private getSettings: () => Record<string, unknown>;
  private setSettings: (settings: Record<string, unknown>) => void;

  constructor(
    pluginId: string,
    getSettings: () => Record<string, unknown>,
    setSettings: (settings: Record<string, unknown>) => void
  ) {
    this.pluginId = pluginId;
    this.getSettings = getSettings;
    this.setSettings = setSettings;
  }

  load(key: string): unknown {
    const settings = this.getSettings();
    return settings[key];
  }

  save(key: string, value: unknown): void {
    const settings = this.getSettings();
    settings[key] = value;
    this.setSettings(settings);
  }

  delete(key: string): void {
    const settings = this.getSettings();
    delete settings[key];
    this.setSettings(settings);
  }

  getAll(): Record<string, unknown> {
    return { ...this.getSettings() };
  }
}

class DOMAPI {
  private styleElements: Map<string, HTMLStyleElement> = new Map();

  addStyle(id: string, css: string): void {
    this.removeStyle(id);
    const style = document.createElement('style');
    style.id = `notebook-plugin-style-${id}`;
    style.textContent = css;
    document.head.appendChild(style);
    this.styleElements.set(id, style);
  }

  removeStyle(id: string): void {
    const existing = this.styleElements.get(id);
    if (existing) {
      existing.remove();
      this.styleElements.delete(id);
    }
  }

  parseHTML(html: string): HTMLElement {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild as HTMLElement;
  }

  onRemoved(element: HTMLElement, callback: () => void): void {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const removed of mutation.removedNodes) {
          if (removed === element || (removed as HTMLElement).contains?.(element)) {
            callback();
            observer.disconnect();
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

class UIAPI {
  showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `notebook-toast notebook-toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
      background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : type === 'success' ? '#22c55e' : '#3b82f6'};
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  showConfirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const result = window.confirm(`${title}\n\n${message}`);
      resolve(result);
    });
  }
}

// Build the API object for a specific plugin
export function createNotebookAPI(
  meta: AddonMeta,
  permissionLevel: PermissionLevel,
  getSettings: () => Record<string, unknown>,
  setSettings: (settings: Record<string, unknown>) => void,
  pluginManager: PluginManager
): Record<string, unknown> {
  const api: Record<string, unknown> = {
    meta,
    Data: new DataAPI(meta.id, getSettings, setSettings),
    DOM: new DOMAPI(),
    UI: new UIAPI(),
    React,
    ReactDOM,
  };

  // Limited: only Data and UI
  if (permissionLevel === 'limited') {
    delete api.DOM;
    delete api.React;
    delete api.ReactDOM;
  }

  // Partial: Data, UI, DOM, no React
  if (permissionLevel === 'partial') {
    delete api.React;
    delete api.ReactDOM;
  }

  // Full: everything including plugin interaction
  if (permissionLevel === 'full') {
    api.Plugins = {
      get: (id: string) => pluginManager.getPlugin(id),
      getAll: () => pluginManager.getAllPlugins(),
      isEnabled: (id: string) => pluginManager.isEnabled(id),
    };
  }

  return api;
}

// ==========================================
// Plugin Manager
// ==========================================

export class PluginManager {
  private plugins: Map<string, PluginInstance> = new Map();
  private state: AddonState;
  private saveState: () => void;
  private onReload?: () => void;

  constructor(state: AddonState, saveState: () => void) {
    this.state = state;
    this.saveState = saveState;
  }

  setOnReload(callback: () => void): void {
    this.onReload = callback;
  }

  async loadPlugin(meta: AddonMeta): Promise<PluginInstance | null> {
    try {
      const code = await window.electronAPI.addons.readPlugin(meta.filePath);
      const permission = this.state.pluginPermissions[meta.id] || 'limited';

      // Create settings accessor
      const getSettings = () => this.state.pluginSettings[meta.id] || {};
      const setSettings = (settings: Record<string, unknown>) => {
        this.state.pluginSettings[meta.id] = settings;
        this.saveState();
      };

      // Create API for this plugin
      const NotebookAPI = createNotebookAPI(meta, permission, getSettings, setSettings, this);

      // Execute plugin code
      // eslint-disable-next-line no-new-func
      const factory = new Function('NotebookAPI', 'meta', `
        ${code}
        if (typeof module !== 'undefined' && module.exports) {
          return typeof module.exports === 'function' ? module.exports(meta) : new module.exports(meta);
        }
        return null;
      `);

      // Set up module mock
      const module = { exports: {} };
      const wrappedFactory = new Function('NotebookAPI', 'meta', 'module', 'exports', `
        ${code}
        if (typeof module.exports === 'function') {
          return module.exports(meta);
        } else if (module.exports && typeof module.exports === 'object' && module.exports.constructor) {
          return new module.exports.constructor(meta);
        }
        return module.exports;
      `);

      const exports = wrappedFactory(NotebookAPI, meta, module, module.exports) || module.exports;

      const instance: PluginInstance = {
        meta,
        exports: exports as PluginExports,
        started: false,
      };

      this.plugins.set(meta.id, instance);
      return instance;
    } catch (error) {
      console.error(`Failed to load plugin ${meta.id}:`, error);
      const instance: PluginInstance = {
        meta,
        exports: {},
        started: false,
        error: (error as Error).message,
      };
      this.plugins.set(meta.id, instance);
      return instance;
    }
  }

  async startPlugin(id: string): Promise<boolean> {
    const instance = this.plugins.get(id);
    if (!instance || instance.started) return false;

    try {
      if (instance.exports.start) {
        instance.exports.start();
      }
      instance.started = true;

      // Update enabled list
      if (!this.state.enabledPlugins.includes(id)) {
        this.state.enabledPlugins.push(id);
        this.saveState();
      }

      return true;
    } catch (error) {
      console.error(`Failed to start plugin ${id}:`, error);
      instance.error = (error as Error).message;
      return false;
    }
  }

  stopPlugin(id: string): boolean {
    const instance = this.plugins.get(id);
    if (!instance || !instance.started) return false;

    try {
      if (instance.exports.stop) {
        instance.exports.stop();
      }
      instance.started = false;

      // Update enabled list
      this.state.enabledPlugins = this.state.enabledPlugins.filter((p) => p !== id);
      this.saveState();

      return true;
    } catch (error) {
      console.error(`Failed to stop plugin ${id}:`, error);
      return false;
    }
  }

  async reloadPlugin(id: string): Promise<boolean> {
    const instance = this.plugins.get(id);
    if (!instance) return false;

    const wasStarted = instance.started;
    if (wasStarted) {
      this.stopPlugin(id);
    }

    // Re-fetch and reload
    const metas = await window.electronAPI.addons.listPlugins();
    const meta = metas.find((m) => m.id === id);
    if (!meta) return false;

    this.plugins.delete(id);
    await this.loadPlugin(meta);

    if (wasStarted) {
      await this.startPlugin(id);
    }

    this.onReload?.();
    return true;
  }

  getPlugin(id: string): PluginInstance | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  isEnabled(id: string): boolean {
    return this.plugins.get(id)?.started || false;
  }

  setPermission(id: string, level: PermissionLevel): void {
    this.state.pluginPermissions[id] = level;
    this.saveState();
  }

  getPermission(id: string): PermissionLevel {
    return this.state.pluginPermissions[id] || 'limited';
  }

  getSettingsPanel(id: string): HTMLElement | React.ReactNode | null {
    const instance = this.plugins.get(id);
    if (!instance?.exports.getSettingsPanel) return null;
    try {
      return instance.exports.getSettingsPanel();
    } catch {
      return null;
    }
  }

  getSettingsDef(id: string): PluginSettingDef[] {
    const instance = this.plugins.get(id);
    return instance?.exports.settings || [];
  }

  getPluginSetting(id: string, key: string): unknown {
    return this.state.pluginSettings[id]?.[key];
  }

  setPluginSetting(id: string, key: string, value: unknown): void {
    if (!this.state.pluginSettings[id]) {
      this.state.pluginSettings[id] = {};
    }
    this.state.pluginSettings[id][key] = value;
    this.saveState();
  }
}

// ==========================================
// Theme Manager
// ==========================================

export class ThemeManager {
  private themes: Map<string, AddonMeta> = new Map();
  private injectedStyles: Map<string, HTMLStyleElement> = new Map();
  private state: AddonState;
  private saveState: () => void;
  private onReload?: () => void;

  constructor(state: AddonState, saveState: () => void) {
    this.state = state;
    this.saveState = saveState;
  }

  setOnReload(callback: () => void): void {
    this.onReload = callback;
  }

  registerTheme(meta: AddonMeta): void {
    this.themes.set(meta.id, meta);
  }

  async enableTheme(id: string): Promise<boolean> {
    const meta = this.themes.get(id);
    if (!meta) return false;

    try {
      let css = await window.electronAPI.addons.readTheme(meta.filePath);

      // Apply user-customized CSS variables
      const userVars = this.state.themeVariables[id] || {};
      for (const [varName, value] of Object.entries(userVars)) {
        // Replace default values with user values
        const regex = new RegExp(`(${varName}\\s*:\\s*)([^;]+)(;)`, 'g');
        css = css.replace(regex, `$1${value}$3`);
      }

      // Inject CSS
      const style = document.createElement('style');
      style.id = `notebook-theme-${id}`;
      style.textContent = css;
      document.head.appendChild(style);
      this.injectedStyles.set(id, style);

      // Update enabled list
      if (!this.state.enabledThemes.includes(id)) {
        this.state.enabledThemes.push(id);
        this.saveState();
      }

      return true;
    } catch (error) {
      console.error(`Failed to enable theme ${id}:`, error);
      return false;
    }
  }

  disableTheme(id: string): boolean {
    const style = this.injectedStyles.get(id);
    if (style) {
      style.remove();
      this.injectedStyles.delete(id);
    }

    this.state.enabledThemes = this.state.enabledThemes.filter((t) => t !== id);
    this.saveState();
    return true;
  }

  async reloadTheme(id: string): Promise<boolean> {
    const wasEnabled = this.state.enabledThemes.includes(id);
    if (wasEnabled) {
      this.disableTheme(id);
    }

    // Re-fetch metadata
    const metas = await window.electronAPI.addons.listThemes();
    const meta = metas.find((m) => m.id === id);
    if (!meta) return false;

    this.themes.set(id, meta);

    if (wasEnabled) {
      await this.enableTheme(id);
    }

    this.onReload?.();
    return true;
  }

  isEnabled(id: string): boolean {
    return this.state.enabledThemes.includes(id);
  }

  getTheme(id: string): AddonMeta | undefined {
    return this.themes.get(id);
  }

  getAllThemes(): AddonMeta[] {
    return Array.from(this.themes.values());
  }

  getCSSVariables(id: string): Array<{ name: string; default: string; description?: string; value: string }> {
    const meta = this.themes.get(id);
    if (!meta?.cssVariables) return [];

    const userVars = this.state.themeVariables[id] || {};
    return meta.cssVariables.map((v) => ({
      ...v,
      value: userVars[v.name] || v.default,
    }));
  }

  setCSSVariable(id: string, varName: string, value: string): void {
    if (!this.state.themeVariables[id]) {
      this.state.themeVariables[id] = {};
    }
    this.state.themeVariables[id][varName] = value;
    this.saveState();

    // Live update if theme is enabled
    if (this.isEnabled(id)) {
      document.documentElement.style.setProperty(varName, value);
    }
  }
}

// ==========================================
// Global Addon System
// ==========================================

let addonState: AddonState | null = null;
let pluginManager: PluginManager | null = null;
let themeManager: ThemeManager | null = null;
let initialized = false;

export async function initAddonSystem(): Promise<{ pluginManager: PluginManager; themeManager: ThemeManager }> {
  if (initialized && pluginManager && themeManager) {
    return { pluginManager, themeManager };
  }

  // Load state
  const loadedState = await window.electronAPI.addons.loadState();
  
  // Ensure all required properties exist
  addonState = {
    enabledPlugins: loadedState.enabledPlugins || [],
    enabledThemes: loadedState.enabledThemes || [],
    pluginPermissions: loadedState.pluginPermissions || {},
    pluginSettings: loadedState.pluginSettings || {},
    themeVariables: (loadedState as AddonState).themeVariables || {},
  };

  const saveState = async () => {
    if (addonState) {
      await window.electronAPI.addons.saveState(addonState);
    }
  };

  pluginManager = new PluginManager(addonState, saveState);
  themeManager = new ThemeManager(addonState, saveState);

  // Load plugins
  const plugins = await window.electronAPI.addons.listPlugins();
  for (const meta of plugins) {
    await pluginManager.loadPlugin(meta);
  }

  // Load themes
  const themes = await window.electronAPI.addons.listThemes();
  for (const meta of themes) {
    themeManager.registerTheme(meta);
  }

  // Auto-start enabled plugins
  for (const id of addonState.enabledPlugins) {
    await pluginManager.startPlugin(id);
  }

  // Auto-enable themes
  for (const id of addonState.enabledThemes) {
    await themeManager.enableTheme(id);
  }

  // Start file watchers for hot reload
  await window.electronAPI.addons.startWatching();

  initialized = true;
  return { pluginManager, themeManager };
}

export function getPluginManager(): PluginManager | null {
  return pluginManager;
}

export function getThemeManager(): ThemeManager | null {
  return themeManager;
}

export function getAddonState(): AddonState | null {
  return addonState;
}

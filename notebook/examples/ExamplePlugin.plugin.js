/**
 * @name Example Plugin
 * @author Notebook Team
 * @description A sample plugin demonstrating the plugin API
 * @version 1.0.0
 * @website https://github.com/example/notebook
 * @source https://github.com/example/notebook-plugin
 */

// Plugin settings schema (optional - enables auto-generated settings UI)
module.exports.settings = [
  { id: 'greeting', name: 'Greeting Message', type: 'text', default: 'Hello from plugin!' },
  { id: 'showOnStart', name: 'Show greeting on start', type: 'switch', default: true },
  { id: 'fontSize', name: 'Font Size', type: 'number', default: 14 },
  { id: 'accentColor', name: 'Accent Color', type: 'color', default: '#3b82f6' },
  { id: 'position', name: 'Position', type: 'dropdown', default: 'bottom-right', options: [
    { label: 'Top Left', value: 'top-left' },
    { label: 'Top Right', value: 'top-right' },
    { label: 'Bottom Left', value: 'bottom-left' },
    { label: 'Bottom Right', value: 'bottom-right' },
  ]},
];

// Plugin class (receives NotebookAPI and meta)
module.exports = class ExamplePlugin {
  constructor(meta) {
    this.meta = meta;
  }

  start() {
    // Called when plugin is enabled
    console.log(`[${this.meta.name}] Plugin started!`);
    
    // Access plugin settings via NotebookAPI.Data
    const greeting = NotebookAPI.Data.load('greeting') || 'Hello!';
    const showOnStart = NotebookAPI.Data.load('showOnStart');
    
    if (showOnStart !== false) {
      NotebookAPI.UI.showToast(greeting, 'info');
    }
    
    // Add custom CSS (requires 'partial' or 'full' permission)
    if (NotebookAPI.DOM) {
      NotebookAPI.DOM.addStyle('example-plugin', `
        .example-plugin-badge {
          position: fixed;
          bottom: 10px;
          right: 10px;
          padding: 4px 8px;
          background: #3b82f6;
          color: white;
          border-radius: 4px;
          font-size: 12px;
          z-index: 9999;
        }
      `);
      
      // Add a badge element
      this.badge = NotebookAPI.DOM.parseHTML('<div class="example-plugin-badge">Example Plugin Active</div>');
      document.body.appendChild(this.badge);
    }
  }

  stop() {
    // Called when plugin is disabled - MUST clean up!
    console.log(`[${this.meta.name}] Plugin stopped!`);
    
    // Remove styles
    if (NotebookAPI.DOM) {
      NotebookAPI.DOM.removeStyle('example-plugin');
    }
    
    // Remove elements
    if (this.badge) {
      this.badge.remove();
      this.badge = null;
    }
  }

  // Optional: Custom settings panel (advanced)
  // getSettingsPanel() {
  //   const panel = document.createElement('div');
  //   panel.innerHTML = '<p>Custom settings UI here</p>';
  //   return panel;
  // }
};

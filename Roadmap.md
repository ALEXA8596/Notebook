# Notebook Roadmap

A comprehensive roadmap for the Notebook application. Inspired by Obsidian, Notion, Excalidraw, OneNote, and GoodNotes.

---

## Version 1.0.0 ✅ (Released January 2026)

### Core Features
- [x] **Electron + React + TypeScript** foundation
- [x] **Vite** for fast development and bundling
- [x] **Tailwind CSS** for styling
- [x] **Zustand** for state management
- [x] **FlexLayout** for flexible tab/pane management

### Document Types
- [x] **Markdown Editor** — Block-based editing with GFM support
- [x] **Excalidraw Integration** — Freehand drawing and diagrams
- [x] **PDF Viewer** — View PDFs in-app
- [x] **Mermaid Diagrams** — Flowcharts, sequence diagrams, etc.
- [x] **Monaco Code Editor** — VS Code's editor engine for code files
- [x] **Kanban Board** — Trello-style task boards
- [x] **Spreadsheets** — Data grids with formulas
- [x] **Desmos Calculator** — Embedded graphing
- [x] **Website Embeds** — iframes for any URL
- [x] **CSV Viewer** — View/edit CSV files
- [x] **HTML Preview** — Render HTML files

### Navigation & Organization
- [x] **File Explorer** — VS Code-style file tree
- [x] **Quick Switcher** — Fuzzy search with `⌘+O`
- [x] **Command Palette** — Central command hub with `⌘+K`
- [x] **Graph View** — Visualize note connections via wikilinks
- [x] **Full-text Search** — Search across all files
- [x] **Vault Manager** — Manage multiple workspaces
- [x] **File Context Menu** — Right-click actions (rename, delete, duplicate)
- [x] **Keyboard Shortcuts** — Comprehensive shortcuts with help modal (`⌘+?`)

### Productivity
- [x] **Task Panel** — Full task management with categories and priorities
- [x] **Calendar View** — Date-based visualization
- [x] **Focus Mode** — Distraction-free writing
- [x] **Pomodoro Timer** — Built-in productivity timer
- [x] **Insights Dashboard** — Writing analytics and statistics
- [x] **Scratch Pad** — Quick notes panel
- [x] **Sticky Notes** — Floating persistent notes
- [x] **Daily Notes** — Quick create today's note

### Customization
- [x] **17 Built-in Themes** — Light and dark options
  - Light: Notion, GitHub, Paper, Sepia, Catppuccin, Mint
  - Dark: Dracula, Nord, Tokyo Night, One Dark, Gruvbox, Solarized, Rosé Pine, Monokai, Obsidian, Midnight, Dark Purple
- [x] **Custom Theme Support** — CSS-based theming with CSS variables
- [x] **Plugin System** — JavaScript plugin architecture
- [x] **Settings Panel** — Comprehensive configuration options

### Security & Privacy
- [x] **Note Encryption** — AES-256-GCM encryption
- [x] **Auto-lock** — Automatic locking of encrypted notes
- [x] **Local-first** — All data stored locally

### AI & Automation
- [x] **AI Copilot** — Built-in AI assistant
- [x] **Safe Tool Calling** — Permission-based file operations
- [x] **Diff Preview** — Review changes before applying
- [x] **Popup or Split Mode** — Flexible copilot display

### Data Management
- [x] **Version History** — Track and restore file versions
- [x] **Auto-save** — Configurable automatic saving
- [x] **Google Drive Sync** — Cloud backup integration
- [x] **File Embeds** — `![[filename]]` syntax support
- [x] **Wikilinks** — `[[note]]` linking between files

### Technical Improvements (1.0)
- [x] **Memory Leak Fixes** — Proper event listener cleanup
- [x] **Error Handling** — Try-catch on all IPC handlers
- [x] **Unsubscribe Patterns** — All event listeners return cleanup functions
- [x] **Tab Management** — `⌘+W` closes tabs, not window

---

## Version 1.1.0 (Planned Q2 2026)

### Collaboration
- [ ] **Real-time Collaboration** — Live editing with multiple users
- [ ] **Share Notes** — Generate shareable links
- [ ] **Comments** — Add comments to notes
- [ ] **Presence Indicators** — See who's viewing a note

### Mobile
- [ ] **Mobile Companion App** — iOS/Android viewer/editor
- [ ] **Sync Protocol** — Cross-device synchronization
- [ ] **Offline Mode** — Full offline support with sync queue

### Content
- [ ] **Template Gallery** — Pre-built templates for common use cases
- [ ] **Daily Note Templates** — Customizable daily note format
- [ ] **Snippets** — Text expansion shortcuts
- [ ] **Custom Blocks** — User-defined embed types

### Search & Discovery
- [ ] **Advanced Search Filters** — Filter by date, type, tags, etc.
- [ ] **Saved Searches** — Bookmark frequent searches
- [ ] **Backlinks Panel** — See all files linking to current file
- [ ] **Outline Panel** — Document structure/TOC view

---

## Version 1.2.0 (Planned Q3 2026)

### Plugin Ecosystem
- [ ] **Plugin Marketplace** — Browse and install plugins
- [ ] **Plugin API v2** — Expanded API with more hooks
- [ ] **Theme Marketplace** — Community themes
- [ ] **Plugin Permissions** — Granular permission system

### Editor Enhancements
- [ ] **WYSIWYG Mode** — Rich text editing option
- [ ] **Table Editor** — Visual table editing
- [ ] **Math Equations** — LaTeX/KaTeX support
- [ ] **Drawing Tools** — Basic pen/highlighter for PDFs
- [ ] **Audio Notes** — Record and embed audio

### Export & Import
- [ ] **Export to PDF** — Print-ready PDF export
- [ ] **Export to Word** — .docx export
- [ ] **Export to HTML** — Static site generation
- [ ] **Import from Notion** — Migration tool
- [ ] **Import from Obsidian** — Vault import

### Performance
- [ ] **Virtual Scrolling** — Handle large documents
- [ ] **Lazy Loading** — Load content on demand
- [ ] **Worker Threads** — Heavy operations off main thread
- [ ] **Indexed Search** — Pre-indexed full-text search

---

## Version 2.0.0 (Future)

### Major Features
- [ ] **Desktop + Web Parity** — Web version of Notebook
- [ ] **Enterprise Features** — Team workspaces, admin controls
- [ ] **E2E Encryption** — End-to-end encrypted sync
- [ ] **Self-hosted Option** — Run your own sync server
- [ ] **API Access** — Public API for integrations

### Freehand Notetaking
- [ ] **Wide Ruled** — Lined paper backgrounds
- [ ] **College Ruled** — Standard notebook lines
- [ ] **Graph Paper** — Grid backgrounds
- [ ] **Pressure Sensitivity** — Stylus support
- [ ] **Palm Rejection** — Better touch input handling

### AI Features
- [ ] **Smart Linking** — AI-suggested note connections
- [ ] **Auto-tagging** — Automatic tag suggestions
- [ ] **Summarization** — AI note summaries
- [ ] **Translation** — Multi-language support
- [ ] **Voice Transcription** — Speech-to-text

---

## Completed Features Timeline

| Version | Release | Highlights |
|---------|---------|------------|
| 1.0.0 | Jan 2026 | Full feature set, 17 themes, plugin system, encryption, AI copilot |

---

## Contributing

Want to help shape the roadmap? 

1. Open an issue to suggest features
2. Vote on existing feature requests with 👍
3. Submit PRs for planned features
4. Join discussions in GitHub Discussions

---

## Legend

- ✅ **Released** — Available in current version
- [x] **Completed** — Implemented and tested
- [ ] **Planned** — On the roadmap
- 🚧 **In Progress** — Currently being developed

---

*Last updated: January 3, 2026*

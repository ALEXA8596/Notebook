# Notebook

A powerful, local-first note-taking desktop application built with Electron and React. Inspired by Obsidian, Notion, Excalidraw, OneNote, and GoodNotes.

![Version](https://img.shields.io/badge/version-1.0.0-green.svg) ![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Electron](https://img.shields.io/badge/Electron-39.2.7-47848F.svg?logo=electron) ![React](https://img.shields.io/badge/React-19.1.0-61DAFB.svg?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?logo=typescript)

---

## ✨ What's New in v1.0.0

- **Full Theme System** — 17 beautiful themes including Notion, Dracula, Nord, Tokyo Night, Catppuccin, and more
- **Plugin Architecture** — Extensible plugin system with sandboxed execution
- **Focus Mode & Pomodoro** — Distraction-free writing with built-in productivity timer
- **Sticky Notes** — Quick floating notes that persist across sessions
- **Cloud Sync** — Google Drive integration for backup and sync
- **Task Management** — Full-featured task panel with categories, priorities, and due dates
- **Calendar View** — Visualize your notes and tasks by date
- **Whiteboard & Diagrams** — Create freeform drawings and structured diagrams
- **Note Encryption** — AES-256-GCM encryption for sensitive notes
- **Insights Dashboard** — Analytics about your writing habits
- **Version History** — Track and restore previous versions of your notes

---

## Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Project Structure](#project-structure)
- [Themes](#themes)
- [Development](#development)
- [Extensibility](#extensibility)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### 📝 Rich Document Types

| Type | Description |
|------|-------------|
| **Markdown Editor** | GitHub-flavored markdown with syntax highlighting, live preview, and block-based editing |
| **Excalidraw** | Freehand drawing, diagrams, and collaborative whiteboarding |
| **PDF Viewer** | View and annotate PDF documents directly in-app |
| **Mermaid Diagrams** | Flowcharts, sequence diagrams, Gantt charts, and more |
| **Code Playground** | Monaco editor (VS Code's engine) with full syntax highlighting for 50+ languages |
| **Kanban Board** | Trello-style task management with drag-and-drop |
| **Spreadsheets** | Data grid for tabular data with formulas |
| **Desmos Calculator** | Embedded graphing calculator |
| **Website Embeds** | Embed any website in your notes |
| **CSV Viewer** | View and edit CSV files with sorting and filtering |
| **HTML Preview** | Render HTML files with live preview |

### 🎯 Core Features

- **File Explorer** — Obsidian/VS Code-style navigation with folder support and drag-and-drop
- **Flexible Layout** — Drag-and-drop tabs with split panes (powered by FlexLayout)
- **Graph View** — Visualize connections between notes via `[[wikilinks]]`
- **Full-text Search** — Instantly find content across all files
- **Quick Switcher** — Rapidly navigate between files with `⌘+O`
- **Command Palette** — Access all commands with `⌘+K`
- **Version History** — Track changes with automatic version snapshots
- **Vault Manager** — Manage multiple note vaults/workspaces
- **Auto-save** — Never lose your work with configurable auto-save
- **Local-first** — All data stays on your machine by default

### 🎨 Customization

- **17 Built-in Themes** — From light (Notion, GitHub, Paper) to dark (Dracula, Nord, Tokyo Night)
- **Custom CSS Themes** — Create and share your own themes
- **Plugin System** — Extend functionality with JavaScript plugins
- **Customizable Sidebar** — Pin your favorite features

### 🔐 Privacy & Security

- **Note Encryption** — AES-256-GCM encryption with password protection
- **Auto-lock** — Automatically lock encrypted notes after inactivity
- **No Telemetry** — Your data is never sent to any server
- **Open Source** — Full transparency of code

### 🤖 AI Copilot

- **Built-in AI Assistant** — Chat interface for note assistance
- **Safe Tool Calling** — Permission-based file operations
- **Diff Preview** — Review AI-proposed changes before applying
- **Split or Popup Mode** — Use in sidebar or separate window

### 📊 Productivity

- **Task Panel** — Create, organize, and track tasks with priorities and due dates
- **Calendar View** — Visualize your notes and tasks over time
- **Focus Mode** — Distraction-free writing environment
- **Pomodoro Timer** — Built-in productivity timer
- **Insights Dashboard** — Analytics about your writing patterns
- **Scratch Pad** — Quick notes without creating files
- **Sticky Notes** — Floating notes that persist across sessions

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Electron](https://www.electronjs.org/) + [Electron Forge](https://www.electronforge.io/) |
| Frontend | [React 19](https://react.dev/) + [TypeScript 5.8](https://www.typescriptlang.org/) |
| Bundler | [Vite](https://vitejs.dev/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Layout | [FlexLayout React](https://github.com/nickelstar/FlexLayout) |
| State | [Zustand](https://github.com/pmndrs/zustand) |
| Icons | [Lucide React](https://lucide.dev/) |
| Editor | Custom block-based + [Monaco](https://microsoft.github.io/monaco-editor/) |
| Drawings | [Excalidraw](https://excalidraw.com/) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/ALEXA8596/Notebook.git
cd Notebook/notebook

# Install dependencies
npm install

# Start the development server
npm start
```

### Build

```bash
# Package the app (unpacked)
npm run package

# Create distributable installer
npm run make
```

---

## Keyboard Shortcuts

### General
| Shortcut | Action |
|----------|--------|
| `⌘+S` | Save all unsaved changes |
| `⌘+O` | Quick file switcher |
| `⌘+K` | Open command palette |
| `⌘+/` | Toggle search |
| `⌘+?` | Show keyboard shortcuts |
| `⌘+N` | Create new note |
| `⌘+Shift+N` | Quick note (sticky) |
| `⌘+W` | Close current tab |
| `⌘+Shift+W` | Close window |

### Editor
| Shortcut | Action |
|----------|--------|
| `⌘+B` | Bold text |
| `⌘+I` | Italic text |
| `⌘+U` | Underline text |
| `⌘+Shift+K` | Strikethrough |
| `⌘+E` | Inline code |
| `⌘+L` | Insert link |
| `⌘+Shift+X` | Toggle checkbox |
| `Tab` | Indent / autocomplete |
| `Shift+Tab` | Outdent |

### Navigation
| Shortcut | Action |
|----------|--------|
| `⌘+P` | Quick switcher |
| `⌘+Shift+F` | Global search |
| `⌘+G` | Open graph view |
| `⌘+\` | Toggle sidebar |
| `⌘+Tab` | Next tab |
| `⌘+Shift+Tab` | Previous tab |

### Productivity
| Shortcut | Action |
|----------|--------|
| `⌘+T` | Open tasks panel |
| `⌘+Shift+C` | Open calendar |
| `⌘+Shift+I` | Open insights |
| `⌘+Shift+W` | Open whiteboard |
| `⌘+Shift+D` | Create daily note |
| `⌘+Shift+P` | Focus mode / Pomodoro |
| `⌘+Shift+A` | Open AI Copilot |

---

## Project Structure

```
notebook/
├── src/
│   ├── main.ts              # Electron main process
│   ├── preload.ts           # IPC bridge (contextBridge)
│   ├── electron.d.ts        # TypeScript declarations for IPC
│   ├── renderer.tsx         # React entry point
│   ├── App.tsx              # Main React component & tab factory
│   ├── App.css              # Global styles & FlexLayout overrides
│   ├── index.css            # Tailwind + CSS variables
│   ├── components/
│   │   ├── editor/          # Block-based markdown editor
│   │   ├── embeds/          # Embed components (Excalidraw, PDF, Monaco, etc.)
│   │   ├── ui/              # Reusable UI components (Modal, ContextMenu)
│   │   ├── CopilotPanel.tsx # AI assistant
│   │   ├── FileExplorer.tsx # File tree navigation
│   │   ├── GraphView.tsx    # Note graph visualization
│   │   ├── TaskPanel.tsx    # Task management
│   │   ├── CalendarPanel.tsx# Calendar view
│   │   ├── InsightsPanel.tsx# Writing analytics
│   │   ├── FocusMode.tsx    # Distraction-free mode
│   │   ├── ScratchPad.tsx   # Quick notes & stickies
│   │   ├── SettingsModal.tsx# App settings
│   │   └── ...
│   ├── lib/
│   │   ├── fileSystem.ts    # Renderer-side fs helpers
│   │   ├── linkManager.ts   # Wikilink parsing & graph building
│   │   ├── addonManager.ts  # Theme/plugin loading system
│   │   ├── encryption.ts    # AES-256-GCM encryption
│   │   ├── versionHistory.ts# Version tracking
│   │   ├── googleDrive.ts   # Cloud sync
│   │   └── taskbone.ts      # Task management logic
│   └── store/
│       ├── store.ts         # Main Zustand store
│       └── taskStore.ts     # Task state management
├── examples/                 # Bundled themes & example plugins
│   ├── *.theme.css          # 17 theme files
│   └── ExamplePlugin.plugin.js
├── forge.config.ts          # Electron Forge config
├── vite.*.config.ts         # Vite configurations
└── package.json
```

---

## Themes

Notebook includes 17 beautiful themes:

### Light Themes
- **Notion** — Clean, minimal Notion-inspired design
- **GitHub** — GitHub's light color scheme
- **Paper** — Distraction-free paper-white
- **Sepia** — Warm, book-like reading experience
- **Catppuccin Latte** — Soothing pastel colors
- **Mint** — Fresh green tones

### Dark Themes
- **Dracula** — Popular dark purple theme
- **Nord** — Arctic, bluish color palette
- **Tokyo Night** — Vibrant Tokyo-inspired colors
- **One Dark** — Atom's iconic dark theme
- **Gruvbox** — Retro groove colors
- **Solarized Dark** — Precision colors for machines and people
- **Rosé Pine** — All-natural pine, faux fur, and Soho vibes
- **Monokai** — Sublime Text's classic scheme
- **Obsidian** — Inspired by Obsidian.md
- **Midnight** — Deep blue darkness
- **Dark Purple** — Rich purple accents

### Custom Themes

Create your own theme by adding a `.theme.css` file to your addons folder:

```css
/**
 * @name My Theme
 * @author Your Name
 * @description My custom theme
 * @version 1.0.0
 */

:root {
  --theme-bg: #ffffff;
  --theme-sidebar: #f5f5f5;
  --theme-accent: #2563eb;
  --theme-text: #1f2937;
  --theme-text-muted: #6b7280;
  --theme-border: #e5e5e5;
}
```

---

## Development

### Commands

All commands should be run from the `notebook/` directory:

| Command | Description |
|---------|-------------|
| `npm start` | Start dev server with hot reload |
| `npm run package` | Build unpacked app |
| `npm run make` | Create distributable installer |
| `npm run lint` | Run ESLint |

### IPC Architecture

All filesystem operations flow through the Electron IPC bridge:

1. `src/main.ts` — IPC handlers with try-catch error handling
2. `src/preload.ts` — Context bridge with unsubscribe functions for event listeners
3. `src/electron.d.ts` — TypeScript declarations
4. `src/lib/fileSystem.ts` — Renderer-side wrapper functions

> ⚠️ Never import Node `fs` directly in renderer code. Always use `window.electronAPI` or helpers in `src/lib/fileSystem.ts`.

### State Management

Global state is managed by Zustand stores:

**Main Store (`store.ts`):**
| Key | Type | Description |
|-----|------|-------------|
| `fileContents` | `Record<string, string>` | Cached file content by path |
| `unsavedChanges` | `Set<string>` | Tracks dirty files |
| `fileStructure` | `FileEntry[]` | Recursive folder tree |
| `theme` | `string` | Current theme name |
| `autosaveEnabled` | `boolean` | Auto-save toggle |

**Task Store (`taskStore.ts`):**
| Key | Type | Description |
|-----|------|-------------|
| `tasks` | `Task[]` | All tasks |
| `categories` | `Category[]` | Task categories |
| `tags` | `string[]` | Available tags |

---

## Extensibility

### Adding a New Embed Type

1. Create `src/components/embeds/MyEmbed.tsx`:
   ```tsx
   interface Props {
     dataString: string;
     onChange: (newData: string) => void;
   }
   
   export const MyEmbed: React.FC<Props> = ({ dataString, onChange }) => {
     // Your component logic
   };
   ```

2. Register the file extension in `App.tsx`'s `FileTabContent`:
   ```tsx
   if (path.endsWith('.mytype')) {
     return <MyEmbed dataString={content} onChange={handleEditorChange} />;
   }
   ```

### Plugins

Plugins are JavaScript files with a specific metadata format:

```javascript
/**
 * @name My Plugin
 * @author Your Name
 * @description What it does
 * @version 1.0.0
 */

module.exports = {
  onLoad() {
    console.log('Plugin loaded!');
  },
  onUnload() {
    console.log('Plugin unloaded!');
  }
};
```

Place plugins in your addons folder (Settings → Appearance → Open Plugins Folder).

---

## Roadmap

See [Roadmap.md](Roadmap.md) for detailed progress.

### v1.0.0 ✅ (Current Release)
- Full theme system with 17 themes
- Plugin architecture
- Task management & calendar
- Focus mode & Pomodoro
- Note encryption
- Cloud sync (Google Drive)
- Version history
- AI Copilot
- Insights dashboard

### v1.1.0 (Planned)
- [ ] Collaborative editing
- [ ] Mobile companion app
- [ ] Plugin marketplace
- [ ] Template gallery
- [ ] Advanced search filters

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow existing code style and patterns
4. Test on your platform before submitting
5. Submit a Pull Request

### Guidelines
- Keep IPC changes coordinated across all four files
- Add proper error handling with try-catch
- Clean up event listeners in useEffect cleanup
- Use TypeScript strict mode

---

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

**Author:** [ALEXA8596](https://github.com/ALEXA8596)

**Star ⭐ this repo if you find it useful!**

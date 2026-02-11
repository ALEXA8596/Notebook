# Copilot Instructions for Notebook

## Project Overview
Electron + React desktop note-taking app inspired by Obsidian/Notion. Local-first with rich embeds (Excalidraw, PDF, Mermaid, Kanban, Monaco, Spreadsheet). Uses Zustand for state, FlexLayout for tabs, and Tailwind for styling.
# Copilot Instructions for Notebook

Purpose: Help AI coding agents become productive quickly in this Electron + React app.

## Code style
- Primary language: TypeScript + React. Follow existing patterns in the `src/` folder (see [src/App.tsx](src/App.tsx#L1) and [src/components/](src/components/)).
- Keep formatting and import ordering consistent with surrounding files; do not reformat entire files unless necessary.

## Architecture (high level)
- Renderer: React + Vite in `notebook/src/` ([src/renderer.tsx](src/renderer.tsx#L1), [src/App.tsx](src/App.tsx#L1)).
- Native bridge: strict IPC flow — implement changes in this order: `src/main.ts` → `src/preload.ts` → `src/electron.d.ts` → `src/lib/fileSystem.ts`.
- State: single Zustand store at [src/store/store.ts](src/store/store.ts#L1).

## Build & run
Run from the `notebook/` folder:
```bash
npm install
npm start      # dev (Vite + Electron Forge)
npm run package
npm run make
```

## Project conventions (practical rules)
- IPC: always add handler → expose in preload → update `electron.d.ts` → add wrapper in `src/lib/fileSystem.ts`.
- Embeds: components live in [src/components/embeds/](src/components/embeds/). Embeds follow `EmbedProps { dataString: string; onChange(newData: string): void }` and are selected by extension in `FileTabContent` ([src/App.tsx](src/App.tsx#L45-L65)).
- File keys in the store use Windows separators (`\\`) — preserve this when manipulating paths.
- Save flow: components may listen for `window.dispatchEvent(new Event('app-save'))` for Ctrl+S behavior.

## Integration points
- Cloud sync: Google Drive helper at [src/lib/googleDrive.ts](src/lib/googleDrive.ts#L1).
- Plugin system: see `examples/` and `src/lib/addonManager.ts`.
- AI tooling example: [src/components/CopilotPanel.tsx](src/components/CopilotPanel.tsx#L1) demonstrates safe tool-calling and diff preview.

## Security notes
- Encryption: AES-256-GCM is used for encrypted notes — review `src/lib/encryption.ts` when touching crypto logic.
- No telemetry by design; avoid adding remote logging without explicit consent.

## Quick links
- IPC handlers: [src/main.ts](src/main.ts#L1), [src/preload.ts](src/preload.ts#L1), [src/lib/fileSystem.ts](src/lib/fileSystem.ts#L1)
- Embeds: [src/components/embeds/](src/components/embeds/)
- Store: [src/store/store.ts](src/store/store.ts#L1)
- AI example: [src/components/CopilotPanel.tsx](src/components/CopilotPanel.tsx#L1)

If you'd like more examples (new-embed template, IPC checklist, or typical PR style), tell me which and I'll expand this file.
```bash

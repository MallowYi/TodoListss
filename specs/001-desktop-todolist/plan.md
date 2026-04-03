# Implementation Plan: Windows Desktop TodoList with Widget Mode

**Branch**: `001-desktop-todolist` | **Date**: 2026-04-02 | **Spec**: `D:\AI-Software\specs\001-desktop-todolist\spec.md`
**Input**: Feature specification from `D:\AI-Software\specs\001-desktop-todolist\spec.md`

## Summary

Build a polished Windows TodoList desktop application with two presentations: a spacious desktop workspace and a compact widget mode. The implementation now uses Electron + React + TypeScript with a frameless custom chrome, modern glassmorphism-inspired styling, local JSON persistence in the user's app-data folder, and an Electron main-process widget controller that manages always-on-top behavior, edge docking, auto-hide, and hover-to-reveal interactions.

## Technical Context

**Language/Version**: TypeScript / React 18 / Electron 30  
**Primary Dependencies**: Electron, React, Vite, `lucide-react`  
**Storage**: Local JSON file under Electron `app.getPath('userData')\state.json`  
**Testing**: `npm run lint`, `npm run build`, and manual widget validation  
**Target Platform**: Windows 10/11 desktop  
**Project Type**: Desktop application  
**Performance Goals**: App launch ready within 2 seconds on a typical desktop; todo interactions feel immediate; widget reveal begins within 150 ms of hover detection  
**Constraints**: Offline-capable, no admin privileges, always-on-top widget behavior must survive focus changes, auto-hide must keep the widget recoverable from the docked edge  
**Scale/Scope**: Single-user local app, hundreds of todos, one main window plus widget presentation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Windows-native desktop experience**: PASS. Electron's BrowserWindow APIs give direct control over frameless windows, always-on-top behavior, docking math, and screen-edge interactions on Windows.
- **Local-first reliability**: PASS. Persistence is file-based and offline, with explicit load/save behavior and recoverable defaults.
- **Testable separation of concerns**: PASS. Renderer UI state, shared contracts, and main-process window orchestration are separated cleanly.
- **Behavior-driven quality gates**: PASS. Static checks, production builds, and manual validation cover the shell-dependent widget behavior.
- **Simplicity over speculation**: PASS. The scope remains a single-user Windows app without sync, accounts, or cloud services.

## Phase 0 Research

See `research.md` for final technology and behavior decisions covering desktop stack selection, persistence design, widget topmost strategy, edge auto-hide strategy, and testing approach.

## Phase 1 Design Artifacts

- `data-model.md`: data entities and persisted state structure
- `contracts\todo-state.schema.json`: JSON contract for local persisted state
- `quickstart.md`: build, test, run, and manual widget validation steps

## Project Structure

### Documentation (this feature)

```text
specs/001-desktop-todolist/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── todo-state.schema.json
└── tasks.md
```

### Source Code (repository root)

```text
desktop/
├── electron/
│   ├── electron-env.d.ts
│   ├── main.ts
│   └── preload.ts
├── shared/
│   └── contracts.ts
├── src/
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   └── main.tsx
├── electron-builder.json5
├── package.json
├── tsconfig.json
└── vite.config.ts
```

**Structure Decision**: Use a single Electron desktop project with a React renderer, a dedicated main process for Windows widget behavior, and shared contracts for typed persistence/state exchange.

## Complexity Tracking

No constitutional violations are currently expected.

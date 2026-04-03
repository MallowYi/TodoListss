# Research: Windows Desktop TodoList with Widget Mode

## Decision 1: Desktop Stack

- **Decision**: Use C# with WPF on .NET 10.
- **Rationale**: The requested widget behavior depends on native Windows window management, including borderless rendering, persistent topmost placement, drag repositioning, and screen-edge docking. WPF offers direct control over window chrome and interop with Win32 APIs while keeping the UI implementation productive.
- **Alternatives considered**:
  - **WinUI 3**: Viable, but WPF is simpler to stand up quickly in this environment and has mature window management patterns.
  - **Electron/Tauri**: Cross-platform options, but unnecessary for a Windows-only v1 and weaker for the requested native shell behavior.
  - **PySide / Tkinter**: Feasible, but less aligned with native Windows desktop behavior and testing structure in this repo.

## Decision 2: Persistence Format

- **Decision**: Persist state as JSON in `%AppData%\TodoListss\state.json`.
- **Rationale**: JSON is transparent, easy to back up, easy to validate with a schema, and appropriate for a single-user local todo list. It also keeps startup and persistence logic simple.
- **Alternatives considered**:
  - **SQLite**: More robust for future growth, but unnecessary complexity for the requested v1 scope.
  - **Registry storage**: Poor fit for structured todo data and harder to inspect or migrate.

## Decision 3: Widget Topmost Strategy

- **Decision**: Use a combination of WPF window properties and Win32 `SetWindowPos` topmost calls when entering widget mode and when relevant state changes occur.
- **Rationale**: `Topmost = true` covers the normal case, while explicit topmost refresh via Win32 interop improves reliability after focus changes and mode transitions.
- **Alternatives considered**:
  - **WPF `Topmost` only**: Simpler, but less explicit for maintaining the requested "do not get covered by normal windows" behavior.
  - **Low-level shell hooks**: More complex than needed for v1.

## Decision 4: Edge Docking and Auto-Hide

- **Decision**: Treat left, right, and top screen edges as dockable targets. When docked, move most of the window off-screen while leaving a thin interactive strip visible. Use cursor polling to reveal when the pointer touches the relevant edge zone.
- **Rationale**: This approach matches the requested hover-to-reveal behavior and avoids the complexity of a global mouse hook. Leaving a small visible strip keeps the widget discoverable and recoverable.
- **Alternatives considered**:
  - **Fully hidden with hotkey reveal**: Rejected because the user explicitly chose hover reveal.
  - **Global mouse hook**: More invasive and unnecessary when a lightweight polling loop can satisfy the requirement.

## Decision 5: Testing Strategy

- **Decision**: Use xUnit tests for todo operations, persistence behavior, docking calculations, and off-screen recovery logic. Use manual validation for final topmost and hover-reveal behavior on Windows.
- **Rationale**: Business logic and geometry rules are well suited to automated tests, while some shell/window-manager interactions are better verified manually in a live desktop session.
- **Alternatives considered**:
  - **No automated tests**: Rejected by the constitution.
  - **Full UI automation suite**: Valuable later, but unnecessary for the first delivery and slower to establish than focused unit tests.

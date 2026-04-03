# Quickstart: Windows Desktop TodoList with Widget Mode

## Prerequisites

- Windows desktop environment
- Node.js installed
- npm available in `PATH`

## Build

```powershell
Set-Location .\desktop
npm install
npm run build
```

## Test

```powershell
Set-Location .\desktop
npm run lint
npm run build
```

## Run

```powershell
Set-Location .\desktop
npm run dev
```

## Manual Validation

1. Launch the app from `desktop\`.
2. Add at least three todo items.
3. Mark one complete, edit one, and delete one.
4. Close and reopen the app; verify the list is restored.
5. Toggle widget mode from the top-right layout button.
6. Confirm the custom chrome stays compact and the widget remains above standard windows after focus changes.
7. Drag the widget to the left, right, and top edges; verify it auto-hides.
8. Move the mouse to the docked edge; verify the widget slides back into view.
9. Move the widget away from the edge or disable widget mode; verify auto-hide stops.

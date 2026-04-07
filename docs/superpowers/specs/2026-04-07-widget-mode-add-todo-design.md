# Widget Mode Add Todo Design

**Date:** 2026-04-07  
**Status:** Approved for planning  
**Scope:** Electron renderer widget mode only

## Problem

The current Electron widget board is the primary workflow for this project, but it does not provide a direct way to create a new todo. Todo creation exists in normal desktop mode only, which forces widget-first usage back through a mode the user rarely uses.

## Goals

- Add a direct "new todo" entry point inside widget mode.
- Keep the interaction lightweight: button plus small dialog.
- Create new todos into the `backlog` / "收集箱" column.
- Preserve the current widget board layout, drag-and-drop flow, and window behavior.
- Leave normal desktop mode unchanged.

## Non-Goals

- Redesigning the widget board layout.
- Adding notes, column selection, or multi-step creation to the widget flow.
- Reworking normal desktop mode.
- Changing Electron main-process widget behavior, IPC contracts, or persistence shape.

## Approved UX

### Entry Point

- Add a new **"新增待办"** button to the existing `widget-board-actions` area in the widget header.
- Keep the current **"退出挂件"** action in place; the new button sits alongside it as the primary creation entry point.
- Do not add per-column actions or floating action buttons.

### Dialog

- Clicking the button opens a lightweight modal dialog layered over the current widget board.
- The dialog contains:
  - one title input
  - a **"取消"** action
  - a **"创建"** action
- When the dialog opens, keyboard focus moves directly to the title input.
- `Enter` creates the todo when the input is valid.
- `Esc`, clicking the overlay, or clicking **"取消"** closes the dialog.

### Post-Create Behavior

- A created todo is inserted at the front of `state.todos`.
- The new todo defaults to the `backlog` column.
- The new todo becomes the selected item.
- The dialog closes immediately after successful creation.
- The dialog input is cleared on close so the next open starts clean.

## Validation Rules

- The dialog is title-only.
- The **"创建"** button stays disabled until the trimmed title is non-empty.
- Blank or whitespace-only input must not no-op silently through a submit path.

## Technical Design

### Renderer-Only Change

This is an incremental renderer update. The change is expected to stay inside the React app and CSS layer:

- `desktop\src\App.tsx`
  - add widget dialog open/close state
  - add widget title draft state
  - add handlers for open, close, submit, and keyboard behavior
  - render the new widget header button
  - render the modal dialog when open
  - reuse the existing `createTodo(...)` helper and current insertion pattern
- `desktop\src\App.css`
  - add modal overlay, panel, input, and button styles that match the current widget visual language

### No Main-Process Change

These files are intentionally unchanged for this design:

- `desktop\electron\main.ts`
- `desktop\shared\contracts.ts`

The feature does not require new window commands, new IPC methods, or persistence schema changes. Todo creation continues to flow through the existing renderer state and persistence path.

## Behavior Boundaries

- Widget drag, docking, auto-hide, always-on-top, and board drag-and-drop remain intact.
- The modal is a temporary interaction layer over the widget board, not a mode switch.
- Normal desktop mode keeps its current composer and does not share draft state with the widget dialog.

## Verification Approach

Use the existing desktop project validation flow plus targeted manual checks:

- Run `npm run lint` in `desktop\`
- Run `npm run build` in `desktop\`
- Manually verify in Electron widget mode:
  - the new header button opens the dialog
  - `Enter` creates and `Esc` closes
  - the new card appears in `收集箱`
  - docking and auto-hide still behave the same

## Planning Notes

- Keep the change small and local to avoid destabilizing widget window behavior.
- Prefer extracting a small widget dialog render block or helper only if `App.tsx` becomes meaningfully harder to follow.

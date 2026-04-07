# Widget Mode Add Todo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a widget-mode header action that opens a title-only dialog and creates a new todo into the backlog without leaving widget mode.

**Architecture:** Keep the change inside the Electron renderer. Reuse `createTodo(...)`, the existing `state.todos` insertion pattern, and the current widget header/button styling, then layer a small modal over the board with widget-local state and keyboard handling. Do not change `desktop/electron/main.ts` or `desktop/shared/contracts.ts`; persistence continues through the existing renderer state flow.

**Tech Stack:** Electron, React 18, TypeScript, CSS, Vite, ESLint

---

## File Structure

- `docs/superpowers/specs/2026-04-07-widget-mode-add-todo-design.md`
  - Approved scope and UX source of truth.
- `desktop/src/App.tsx`
  - Existing imports and shared helpers live at `1-24`.
  - Local renderer state lives around `190-205`.
  - Todo creation logic lives around `334-351`.
  - Widget-mode render branch lives around `440-612`.
  - This file already owns widget-mode rendering and todo creation, so keep the new dialog state, handlers, and JSX here unless the file becomes meaningfully harder to follow during implementation.
- `desktop/src/App.css`
  - Existing widget shell/header/button styles live around `9-130`.
  - Add modal overlay/panel/input/action styles here so widget visuals remain in one stylesheet.
- `desktop/package.json`
  - Existing supported validation commands live at `6-11`: `npm run lint`, `npm run build`, `npm run dev`.

## Testing Strategy

`desktop/` does not currently have a renderer test harness: there are no Vitest, Jest, React Testing Library, Playwright, or Cypress scripts or dependencies in the desktop project. Stay YAGNI and do **not** introduce new test tooling for this feature. Use the existing `npm run lint`, `npm run build`, and focused manual Electron acceptance checks as the required verification path.

### Task 1: Add the widget create dialog shell

**Files:**
- Modify: `desktop/src/App.tsx`
- Modify: `desktop/src/App.css`
- Reference: `docs/superpowers/specs/2026-04-07-widget-mode-add-todo-design.md`
- Validate: `desktop/package.json`

- [ ] **Step 1: Run the desktop lint baseline**

Run:

```powershell
Set-Location D:\AI-Software\desktop
npm run lint
```

Expected: PASS with exit code 0 before any feature changes.

- [ ] **Step 2: Run the desktop build baseline**

Run:

```powershell
Set-Location D:\AI-Software\desktop
npm run build
```

Expected: PASS with TypeScript compilation and Vite build succeeding before any feature changes.

- [ ] **Step 3: Capture the current failing manual scenario**

Run:

```powershell
Set-Location D:\AI-Software\desktop
npm run dev
```

Expected: Electron opens, widget mode can be entered, and the widget header shows pills plus `退出挂件` but **no** direct `新增待办` entry. Close the dev app after confirming the gap.

- [ ] **Step 4: Add widget-local dialog state and submit helpers in `desktop/src/App.tsx`**

Place the new state near the existing `draftTitle` / `draftNotes` declarations so the feature stays close to other creation logic.

```tsx
const [isWidgetCreateDialogOpen, setIsWidgetCreateDialogOpen] = useState(false)
const [widgetCreateTitle, setWidgetCreateTitle] = useState('')
const widgetCreateTitleTrimmed = widgetCreateTitle.trim()
const canSubmitWidgetCreate = widgetCreateTitleTrimmed.length > 0

function openWidgetCreateDialog(): void {
  setWidgetCreateTitle('')
  setIsWidgetCreateDialogOpen(true)
}

function closeWidgetCreateDialog(): void {
  setWidgetCreateTitle('')
  setIsWidgetCreateDialogOpen(false)
}

function handleWidgetCreateSubmit(): void {
  if (!canSubmitWidgetCreate) {
    return
  }

  const accent = accentSequence[state.todos.length % accentSequence.length]
  const todo = createTodo(widgetCreateTitleTrimmed, '', accent)

  setState((currentState) => ({
    ...currentState,
    todos: [todo, ...currentState.todos],
    selectedTodoId: todo.id,
  }))
  closeWidgetCreateDialog()
}
```

- [ ] **Step 5: Render the new header button and dialog JSX in the widget-mode branch**

Add the new action before `退出挂件`, then render the modal inside the widget branch so it only exists in widget mode.

```tsx
<div className="widget-board-actions">
  <button className="widget-board-button widget-board-button--primary" onClick={openWidgetCreateDialog} type="button">
    <Plus size={16} />
    新增待办
  </button>
  <button
    className="widget-board-button"
    onClick={() => {
      void handleWidgetModeToggle()
    }}
    type="button"
  >
    退出挂件
  </button>
</div>

{isWidgetCreateDialogOpen ? (
  <div className="widget-dialog-backdrop" onClick={closeWidgetCreateDialog} role="presentation">
    <div
      aria-labelledby="widget-create-dialog-title"
      aria-modal="true"
      className="widget-dialog"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          closeWidgetCreateDialog()
        }
      }}
      role="dialog"
    >
      <h2 id="widget-create-dialog-title">新增待办</h2>
      <p>输入标题后直接进入收集箱。</p>
      <input
        autoFocus
        className="widget-dialog__input"
        maxLength={80}
        onChange={(event) => setWidgetCreateTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && canSubmitWidgetCreate) {
            event.preventDefault()
            handleWidgetCreateSubmit()
          }
        }}
        placeholder="比如：整理今天最先推进的一件事"
        value={widgetCreateTitle}
      />
      <div className="widget-dialog__actions">
        <button className="widget-board-button widget-board-button--subtle" onClick={closeWidgetCreateDialog} type="button">
          取消
        </button>
        <button
          className="widget-board-button widget-board-button--primary"
          disabled={!canSubmitWidgetCreate}
          onClick={handleWidgetCreateSubmit}
          type="button"
        >
          创建
        </button>
      </div>
    </div>
  </div>
) : null}
```

- [ ] **Step 6: Add the first-pass modal styles in `desktop/src/App.css`**

Keep the first pass functional; visual polish comes in the next task.

```css
.widget-board-actions {
  gap: 8px;
}

.widget-dialog-backdrop,
.widget-dialog,
.widget-dialog__input {
  -webkit-app-region: no-drag;
}

.widget-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(4, 15, 39, 0.42);
}

.widget-dialog {
  width: min(420px, 100%);
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  background: rgba(8, 21, 54, 0.96);
  box-shadow: 0 18px 48px rgba(2, 12, 32, 0.4);
}

.widget-dialog__input {
  width: 100%;
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid rgba(191, 219, 254, 0.28);
  border-radius: 12px;
  color: #eff6ff;
  background: rgba(15, 23, 42, 0.78);
  font: inherit;
}

.widget-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
```

- [ ] **Step 7: Run lint and build after the shell is in place**

Run:

```powershell
Set-Location D:\AI-Software\desktop
npm run lint
npm run build
```

Expected: PASS. The widget renderer should compile with the new button, local dialog state, and modal shell.

- [ ] **Step 8: Commit the shell**

```powershell
Set-Location D:\AI-Software
git add desktop/src/App.tsx desktop/src/App.css
git commit -m "feat: add widget create dialog shell"
```

### Task 2: Polish widget dialog behavior and styling

**Files:**
- Modify: `desktop/src/App.tsx`
- Modify: `desktop/src/App.css`
- Reference: `docs/superpowers/specs/2026-04-07-widget-mode-add-todo-design.md`
- Validate: `desktop/package.json`

- [ ] **Step 1: Tighten the button variants and disabled states in `desktop/src/App.css`**

Make the new create action look primary without introducing a new visual pattern that clashes with the existing widget header.

```css
.widget-board-button {
  gap: 6px;
}

.widget-board-button--primary {
  background: rgba(255, 255, 255, 0.18);
}

.widget-board-button--subtle {
  background: rgba(6, 19, 57, 0.22);
}

.widget-board-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  transform: none;
}

.widget-board-button:disabled:hover {
  transform: none;
  background: rgba(6, 19, 57, 0.22);
}
```

- [ ] **Step 2: Finish dialog typography, spacing, and focus styles**

Add enough polish that the dialog feels native to the current widget board.

```css
.widget-dialog h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #f8fbff;
}

.widget-dialog p {
  margin: 0;
  color: rgba(226, 232, 240, 0.82);
  line-height: 1.5;
}

.widget-dialog__input::placeholder {
  color: rgba(191, 219, 254, 0.58);
}

.widget-dialog__input:focus {
  outline: none;
  border-color: rgba(125, 211, 252, 0.72);
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18);
}
```

- [ ] **Step 3: Re-check the widget dialog event paths in `desktop/src/App.tsx`**

Confirm these behaviors explicitly in code:

```tsx
// Keep dialog state widget-local; do not reuse draftTitle / draftNotes.
// Overlay click closes; dialog interior stops propagation.
// Escape closes.
// Enter only submits when canSubmitWidgetCreate is true.
// Successful creation inserts into backlog, selects the new todo, closes, and clears input.
```

If the code drifted while styling, correct it before validating.

- [ ] **Step 4: Run lint and build after the polish pass**

Run:

```powershell
Set-Location D:\AI-Software\desktop
npm run lint
npm run build
```

Expected: PASS with no lint warnings and no TypeScript regressions.

- [ ] **Step 5: Commit the polish pass**

```powershell
Set-Location D:\AI-Software
git add desktop/src/App.tsx desktop/src/App.css
git commit -m "feat: polish widget create interactions"
```

### Task 3: Run Electron acceptance checks and handle follow-up fixes

**Files:**
- Modify if needed: `desktop/src/App.tsx`
- Modify if needed: `desktop/src/App.css`
- Reference: `docs/superpowers/specs/2026-04-07-widget-mode-add-todo-design.md`
- Validate: `desktop/package.json`

- [ ] **Step 1: Launch the Electron app for manual acceptance**

Run:

```powershell
Set-Location D:\AI-Software\desktop
npm run dev
```

Expected: Electron dev window opens successfully.

- [ ] **Step 2: Verify the widget-mode checklist**

In the running app, check these exact behaviors:

```text
1. Enter widget mode.
2. Confirm the header shows both “新增待办” and “退出挂件”.
3. Click “新增待办” and confirm a centered dialog opens on top of the board.
4. Confirm the title input receives focus immediately.
5. Confirm the “创建” button stays disabled for blank/whitespace input.
6. Type a valid title and press Enter.
7. Confirm the dialog closes and the new card appears at the front of “收集箱”.
8. Confirm the new card becomes the selected item.
9. Re-open the dialog and confirm Esc, overlay click, and “取消” all close without creating.
10. Drag, dock, auto-hide, and reveal the widget to confirm existing window behavior still works.
```

Expected: All 10 checks pass in the Electron shell.

- [ ] **Step 3: If any acceptance check fails, make only targeted follow-up edits**

Restrict follow-up fixes to `desktop/src/App.tsx` and `desktop/src/App.css` unless a failure proves the plan was wrong about scope.

After each follow-up fix, run:

```powershell
Set-Location D:\AI-Software\desktop
npm run lint
npm run build
```

Expected: PASS after every follow-up edit.

- [ ] **Step 4: Stop the dev app and run the final non-interactive verification**

Run:

```powershell
Set-Location D:\AI-Software\desktop
npm run lint
npm run build
```

Expected: PASS. This is the final machine-checkable verification for the feature.

- [ ] **Step 5: Commit only if Task 3 required code changes**

```powershell
Set-Location D:\AI-Software
git add desktop/src/App.tsx desktop/src/App.css
git commit -m "fix: finalize widget add-todo flow"
```

If Task 3 found no issues and produced no file changes, skip this step rather than creating an empty commit.

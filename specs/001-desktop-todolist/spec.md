# Feature Specification: Windows Desktop TodoList with Widget Mode

**Feature Branch**: `001-desktop-todolist`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "Develop a Windows TodoList application. Language is not constrained. The app must support a widget mode where the window becomes compact, removes the title bar, stays above other windows even after losing focus, and auto-hides when dragged to a desktop edge. When the mouse moves to the docked edge, the widget should slide back into view."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage daily todos in a normal desktop window (Priority: P1)

As a Windows user, I want a normal TodoList window where I can create, view, update, complete, and delete tasks so I can manage my work from a dedicated desktop app.

**Why this priority**: Without reliable todo management and persistence, the product does not provide value, regardless of widget behavior.

**Independent Test**: Launch the app, add several tasks, edit one, mark one complete, delete one, close the app, reopen it, and confirm the saved state is preserved.

**Acceptance Scenarios**:

1. **Given** the app is running with an empty list, **When** the user creates a todo item with a valid title, **Then** the item appears in the list immediately and remains after restart.
2. **Given** an existing todo item, **When** the user marks it complete or incomplete, **Then** the visual state updates and the completion state is saved.
3. **Given** an existing todo item, **When** the user edits or deletes it, **Then** the list reflects the change without requiring an app restart.

---

### User Story 2 - Work from a compact widget that stays visible (Priority: P2)

As a user who wants quick access while multitasking, I want to switch the app into a compact widget mode that removes the normal title bar and stays on top of other windows so I can manage todos without opening a full window.

**Why this priority**: Widget mode is the key differentiator requested by the user and is the main reason to build this desktop app instead of a generic todo program.

**Independent Test**: With the app already supporting normal todo management, toggle widget mode, confirm the window becomes compact and borderless, switch focus to other applications, and verify the widget remains visible above them.

**Acceptance Scenarios**:

1. **Given** the app is in normal mode, **When** the user enables widget mode, **Then** the window becomes compact, removes its title bar, and remains usable for todo viewing and quick updates.
2. **Given** the app is in widget mode, **When** the user clicks another application, **Then** the widget remains above normal desktop windows instead of being covered.
3. **Given** the app is in widget mode, **When** the user disables widget mode, **Then** the window returns to a standard desktop presentation without losing todo data.

---

### User Story 3 - Dock and auto-hide the widget at screen edges (Priority: P3)

As a user who wants the widget available but unobtrusive, I want the widget to auto-hide when docked to a screen edge and slide back into view when I move the mouse to that edge so it does not block my workspace.

**Why this priority**: Edge auto-hide completes the widget experience and directly addresses the requested desktop behavior.

**Independent Test**: Put the app into widget mode, drag it to a screen edge, confirm it hides automatically, then move the mouse to the same edge and confirm it slides back into view.

**Acceptance Scenarios**:

1. **Given** the widget is visible and dragged to a supported screen edge, **When** docking completes, **Then** the widget automatically hides while preserving a discoverable hover target.
2. **Given** the widget is hidden at a docked edge, **When** the user moves the pointer to that edge, **Then** the widget slides back into view without requiring a click.
3. **Given** the widget is revealed from a docked edge, **When** the user moves it away from the edge or disables widget mode, **Then** auto-hide behavior stops until the widget is docked again.

### Edge Cases

- What happens when the user tries to create a todo with only whitespace or an empty title?
- What happens when the local persistence file is missing, unreadable, or contains malformed data?
- How does the app behave if the widget is docked to a monitor edge and that monitor layout changes or becomes unavailable?
- How does the widget behave when docked to a corner where horizontal and vertical edges intersect?
- What happens if the user starts dragging the widget while it is partially hidden or currently revealing?
- How does the app recover if the last saved window position is off-screen on startup?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a Windows desktop application for managing todo items.
- **FR-002**: Users MUST be able to create, edit, complete, uncomplete, and delete todo items from the application UI.
- **FR-003**: The system MUST persist todo items and restore them on the next launch without requiring network access.
- **FR-004**: The system MUST preserve key window preferences needed to restore the user's working mode, including whether widget mode was active and the last known window placement.
- **FR-005**: The system MUST provide a widget mode that can be entered and exited without restarting the application.
- **FR-006**: In widget mode, the system MUST render the app in a compact presentation without the normal window title bar.
- **FR-007**: In widget mode, the system MUST keep the widget above normal desktop windows even when the app loses input focus.
- **FR-008**: In widget mode, the system MUST allow the user to drag the widget to reposition it on screen.
- **FR-009**: When the widget is dragged to a supported screen edge, the system MUST automatically transition it into a hidden docked state.
- **FR-010**: When the pointer reaches the same screen edge as a hidden widget, the system MUST reveal the widget without requiring a click.
- **FR-011**: The system MUST allow the user to interact with todos while the widget is visible in widget mode.
- **FR-012**: The system MUST restore the widget to a visible and reachable position if saved placement data would otherwise place it off-screen.
- **FR-013**: The system MUST reject invalid todo input in a user-visible way rather than silently ignoring it.

### Key Entities *(include if feature involves data)*

- **Todo Item**: A single task entry with an identifier, title, completion status, optional notes, and timestamps needed for ordering and persistence.
- **Application Settings**: Local preferences that describe the current mode, saved window size and position, docked edge state, and related widget behavior settings.
- **Widget State**: Runtime state describing whether the widget is in normal mode, compact mode, docked, hidden, or revealed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can run the app on Windows, create a todo, restart the app, and still see that todo without manual recovery steps.
- **SC-002**: A user can switch between normal mode and widget mode in no more than one direct UI action.
- **SC-003**: In manual validation on Windows, the widget remains visible above standard desktop windows after focus changes in at least 10 consecutive attempts.
- **SC-004**: In manual validation on Windows, docking the widget to a supported edge hides it automatically and hovering that edge reveals it again in at least 10 consecutive attempts.

## Assumptions

- The first release targets a single local Windows user and does not include sync, login, or collaboration.
- The app may choose any implementation language or framework, but it must run natively on Windows and satisfy the required window behaviors.
- Local file storage is acceptable for v1 persistence.
- The initial release focuses on desktop interaction and does not need mobile or web clients.

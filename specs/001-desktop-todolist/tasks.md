# Tasks: Windows Desktop TodoList with Widget Mode

**Input**: Design documents from `D:\AI-Software\specs\001-desktop-todolist\`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts\todo-state.schema.json`

**Tests**: Add automated tests for services and view models, plus manual validation for widget shell behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`US1`, `US2`, `US3`)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the solution and basic project layout.

- [x] T001 Create `TodoListss.sln`, `src\TodoListss.App\TodoListss.App.csproj`, and `tests\TodoListss.App.Tests\TodoListss.App.Tests.csproj`
- [x] T002 Add project references and NuGet dependencies required for WPF, MVVM helpers, and xUnit
- [x] T003 [P] Create source folders under `src\TodoListss.App\` and test folders under `tests\TodoListss.App.Tests\`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the domain, persistence, geometry, and widget infrastructure used by all stories.

- [x] T004 Create models in `src\TodoListss.App\Models\TodoItem.cs`, `AppSettings.cs`, `PersistedState.cs`, `DockEdge.cs`, and `WindowPlacement.cs`
- [x] T005 [P] Implement JSON persistence in `src\TodoListss.App\Services\PersistenceService.cs`
- [x] T006 [P] Implement off-screen recovery and placement normalization in `src\TodoListss.App\Services\WindowStateRecoveryService.cs`
- [x] T007 [P] Implement docking geometry and hide/reveal calculations in `src\TodoListss.App\Services\DockingService.cs`
- [x] T008 Implement Win32 interop helpers in `src\TodoListss.App\Infrastructure\NativeMethods.cs`
- [x] T009 Implement widget mode orchestration in `src\TodoListss.App\Services\WidgetModeService.cs`
- [x] T010 Create the main view model shell in `src\TodoListss.App\ViewModels\MainWindowViewModel.cs`
- [x] T011 Add foundational tests in `tests\TodoListss.App.Tests\Services\PersistenceServiceTests.cs`, `DockingServiceTests.cs`, and `WindowStateRecoveryServiceTests.cs`

**Checkpoint**: Foundation ready - user story implementation can begin.

---

## Phase 3: User Story 1 - Manage daily todos (Priority: P1) 🎯 MVP

**Goal**: Deliver a fully functional Windows todo list with local persistence.

**Independent Test**: Launch the app, add/edit/complete/delete todos, restart the app, and verify state is preserved.

### Tests for User Story 1

- [x] T012 [P] [US1] Add view model tests for todo commands and validation in `tests\TodoListss.App.Tests\ViewModels\MainWindowViewModelTests.cs`

### Implementation for User Story 1

- [x] T013 [US1] Implement todo collection commands and validation in `src\TodoListss.App\ViewModels\MainWindowViewModel.cs`
- [x] T014 [US1] Build the main window UI in `src\TodoListss.App\MainWindow.xaml` and `MainWindow.xaml.cs`
- [x] T015 [P] [US1] Create reusable todo item UI in `src\TodoListss.App\Views\TodoItemControl.xaml`
- [x] T016 [US1] Wire startup load and save-on-change behavior in `src\TodoListss.App\App.xaml.cs`

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Compact always-on-top widget mode (Priority: P2)

**Goal**: Enable switching between normal mode and a compact borderless widget that stays above standard windows.

**Independent Test**: Toggle widget mode and verify borderless compact behavior plus always-on-top persistence after focus changes.

### Tests for User Story 2

- [x] T017 [P] [US2] Add widget mode state tests in `tests\TodoListss.App.Tests\ViewModels\MainWindowViewModelTests.cs`

### Implementation for User Story 2

- [x] T018 [US2] Add widget mode toggle commands and state in `src\TodoListss.App\ViewModels\MainWindowViewModel.cs`
- [x] T019 [US2] Implement mode-dependent chrome, sizing, and topmost transitions in `src\TodoListss.App\Services\WidgetModeService.cs`
- [x] T020 [US2] Update `src\TodoListss.App\MainWindow.xaml` and `MainWindow.xaml.cs` to support compact widget presentation and drag handling

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Edge auto-hide and hover reveal (Priority: P3)

**Goal**: Dock the widget to screen edges, auto-hide it, and reveal it on hover.

**Independent Test**: In widget mode, drag to a supported edge, verify auto-hide, then hover the same edge and verify reveal.

### Tests for User Story 3

- [x] T021 [P] [US3] Add edge docking and reveal tests in `tests\TodoListss.App.Tests\Services\DockingServiceTests.cs`

### Implementation for User Story 3

- [x] T022 [US3] Implement cursor monitoring in `src\TodoListss.App\Services\CursorMonitorService.cs`
- [x] T023 [US3] Complete dock/hide/reveal orchestration in `src\TodoListss.App\Services\WidgetModeService.cs`
- [x] T024 [US3] Integrate docking feedback and reveal behavior in `src\TodoListss.App\MainWindow.xaml.cs`

**Checkpoint**: All user stories are functional and independently verifiable.

---

## Final Phase: Polish & Validation

- [x] T025 [P] Update persisted-state contract if implementation details change in `specs\001-desktop-todolist\contracts\todo-state.schema.json`
- [x] T026 Run `dotnet build` and `dotnet test`
- [ ] T027 Perform the manual validation steps in `specs\001-desktop-todolist\quickstart.md`

---

## Dependencies & Execution Order

- Setup must complete before foundational work.
- Foundational work blocks all user stories.
- User Story 1 is the MVP and should land before widget-specific work.
- User Story 2 depends on the main window and persistence foundation from User Story 1.
- User Story 3 depends on widget mode orchestration from User Story 2.

## Implementation Strategy

1. Build the solution and domain foundation.
2. Deliver User Story 1 as the first usable product increment.
3. Add compact always-on-top widget mode.
4. Add edge auto-hide and hover reveal.
5. Validate with automated tests and Windows manual checks.

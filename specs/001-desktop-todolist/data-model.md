# Data Model: Windows Desktop TodoList with Widget Mode

## TodoItem

- **Purpose**: Represents a single task in the user's todo list.
- **Fields**:
  - `Id` (`Guid`): Stable identifier for persistence and UI operations
  - `Title` (`string`): Required visible task title
  - `IsCompleted` (`bool`): Completion state
  - `CreatedAtUtc` (`DateTimeOffset`): Creation timestamp
  - `UpdatedAtUtc` (`DateTimeOffset`): Last modification timestamp
  - `SortOrder` (`int`): Explicit ordering field for stable presentation
- **Validation**:
  - `Title` must not be null, empty, or whitespace
  - `Title` should be trimmed before persistence

## AppSettings

- **Purpose**: Stores local preferences and window behavior across launches.
- **Fields**:
  - `IsWidgetModeEnabled` (`bool`): Whether the last active mode was widget mode
  - `NormalWindowBounds` (`WindowPlacement`): Saved size and position for normal mode
  - `WidgetWindowBounds` (`WindowPlacement`): Saved size and position for widget mode
  - `DockEdge` (`DockEdge`): Current docked edge or `None`
  - `IsAutoHidden` (`bool`): Whether the widget is currently hidden at an edge
  - `PeekThickness` (`double`): Visible sliver thickness when hidden
- **Validation**:
  - Bounds must be recoverable to an on-screen rectangle
  - `PeekThickness` must remain within a safe minimum and maximum range

## WindowPlacement

- **Purpose**: Captures window geometry needed to restore the app safely.
- **Fields**:
  - `Left` (`double`)
  - `Top` (`double`)
  - `Width` (`double`)
  - `Height` (`double`)
- **Validation**:
  - Width and height must be positive
  - Placement must be adjusted if it falls outside connected display bounds

## DockEdge

- **Purpose**: Expresses the screen edge behavior for widget docking.
- **Values**:
  - `None`
  - `Left`
  - `Right`
  - `Top`

## PersistedState

- **Purpose**: Root object stored in the local JSON file.
- **Fields**:
  - `Version` (`int`): Data format version for future migrations
  - `Todos` (`List<TodoItem>`)
  - `Settings` (`AppSettings`)

## Relationships

- `PersistedState` owns all `TodoItem` entries and the single `AppSettings` object.
- `AppSettings` references two `WindowPlacement` objects for normal and widget mode restoration.

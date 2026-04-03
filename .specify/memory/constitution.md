# TodoListss Constitution

## Core Principles

### I. Windows-Native Desktop Experience
The application MUST behave like a polished Windows desktop app first, not a browser app wrapped for desktop. Window behavior, drag interactions, topmost behavior, compact widget transitions, and screen-edge handling MUST feel native on Windows 10/11. Any design choice that weakens native window control or reliability must be rejected unless there is a documented user benefit that cannot be achieved otherwise.

### II. Local-First Reliability
The app MUST remain fully usable offline and MUST persist user todo data and window preferences locally. User data loss is unacceptable during normal operation. Persistence changes MUST be explicit, recoverable where practical, and validated against malformed or missing local state.

### III. Testable Separation of Concerns
Business rules, persistence, and window-mode behavior MUST be implemented in testable units rather than buried directly in UI event handlers. UI code may coordinate platform APIs, but state transitions, widget-mode rules, docking logic, and persistence behavior MUST be kept in services or view models that can be exercised by automated tests.

### IV. Behavior-Driven Quality Gates
Every user-visible workflow added to the app MUST have an executable validation path. Core todo operations, persistence, widget mode toggling, and edge auto-hide behavior MUST be covered by automated tests where practical, plus a documented manual verification path for window-manager interactions that are difficult to fully simulate.

### V. Simplicity Over Speculation
The first release MUST focus on a single-user Windows TodoList experience with a strong widget mode. Features such as cloud sync, collaboration, accounts, reminders, or mobile clients are out of scope until the local desktop experience is stable. New complexity must be justified against immediate user value.

## Technical Constraints

- The implementation stack for this repository is C# on .NET with WPF.
- The app MUST run on Windows desktop environments supported by the installed .NET desktop runtime.
- Local persistence MUST use straightforward file-based storage that can be inspected and backed up by the user.
- The widget mode MUST support borderless rendering, always-on-top behavior, drag repositioning, and automatic hide/reveal at desktop edges.
- The repository MUST remain buildable with standard `dotnet` tooling.

## Development Workflow and Quality Gates

- Work follows the Spec-Kit sequence: constitution, specification, plan, tasks, implementation, and validation.
- Every significant behavioral change MUST be reflected in the relevant spec artifacts before or alongside implementation.
- New code MUST build cleanly with `dotnet build`.
- Automated tests MUST pass before a task is considered complete.
- Manual validation notes MUST be recorded for behaviors that depend on Windows shell interactions, topmost rules, or pointer-triggered edge reveal.

## Governance

This constitution governs architecture and delivery decisions for the repository. Plans, tasks, and implementations MUST explicitly satisfy these principles or document why an exception is necessary. Any amendment must update the constitution, associated spec artifacts, and validation expectations in the same change set.

**Version**: 1.0.0 | **Ratified**: 2026-04-02 | **Last Amended**: 2026-04-02

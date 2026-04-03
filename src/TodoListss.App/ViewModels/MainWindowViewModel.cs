using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.ComponentModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using TodoListss.App.Models;

namespace TodoListss.App.ViewModels;

public sealed class MainWindowViewModel : ObservableObject
{
    private readonly ObservableCollection<TodoItemViewModel> _todos = [];
    private AppSettings _settings = new();
    private string _newTodoTitle = string.Empty;
    private TodoItemViewModel? _selectedTodo;
    private string _editTodoTitle = string.Empty;
    private string _statusMessage = "Ready to capture your next task.";

    public MainWindowViewModel()
    {
        _todos.CollectionChanged += OnTodosCollectionChanged;

        AddTodoCommand = new RelayCommand(AddTodo, CanAddTodo);
        SaveSelectedTodoCommand = new RelayCommand(SaveSelectedTodo, CanSaveSelectedTodo);
        DeleteSelectedTodoCommand = new RelayCommand(DeleteSelectedTodo, CanDeleteSelectedTodo);
        DeleteTodoCommand = new RelayCommand<TodoItemViewModel?>(DeleteTodo);
        ToggleWidgetModeCommand = new RelayCommand(ToggleWidgetMode);
    }

    public event EventHandler? StateChanged;

    public ObservableCollection<TodoItemViewModel> Todos => _todos;

    public AppSettings Settings => _settings;

    public bool IsWidgetMode => _settings.IsWidgetModeEnabled;

    public bool IsAutoHidden => _settings.IsAutoHidden;

    public bool IsDocked => _settings.DockEdge != DockEdge.None;

    public bool HasSelectedTodo => SelectedTodo is not null;

    public string ToggleWidgetModeButtonText => IsWidgetMode ? "Exit Widget" : "Widget Mode";

    public string ModeSummary => IsWidgetMode
        ? IsDocked
            ? $"Widget mode · docked {Settings.DockEdge.ToString().ToLowerInvariant()}"
            : "Widget mode · always on top"
        : "Standard desktop window";

    public string NewTodoTitle
    {
        get => _newTodoTitle;
        set
        {
            if (SetProperty(ref _newTodoTitle, value))
            {
                AddTodoCommand.NotifyCanExecuteChanged();
            }
        }
    }

    public TodoItemViewModel? SelectedTodo
    {
        get => _selectedTodo;
        set
        {
            if (SetProperty(ref _selectedTodo, value))
            {
                EditTodoTitle = value?.Title ?? string.Empty;
                OnPropertyChanged(nameof(HasSelectedTodo));
                SaveSelectedTodoCommand.NotifyCanExecuteChanged();
                DeleteSelectedTodoCommand.NotifyCanExecuteChanged();
            }
        }
    }

    public string EditTodoTitle
    {
        get => _editTodoTitle;
        set
        {
            if (SetProperty(ref _editTodoTitle, value))
            {
                SaveSelectedTodoCommand.NotifyCanExecuteChanged();
            }
        }
    }

    public string StatusMessage
    {
        get => _statusMessage;
        private set => SetProperty(ref _statusMessage, value);
    }

    public IRelayCommand AddTodoCommand { get; }

    public IRelayCommand SaveSelectedTodoCommand { get; }

    public IRelayCommand DeleteSelectedTodoCommand { get; }

    public IRelayCommand<TodoItemViewModel?> DeleteTodoCommand { get; }

    public IRelayCommand ToggleWidgetModeCommand { get; }

    public void LoadState(PersistedState state)
    {
        foreach (var todo in _todos)
        {
            todo.PropertyChanged -= OnTodoPropertyChanged;
        }

        _todos.Clear();

        foreach (var todo in state.Todos.OrderBy(todo => todo.SortOrder))
        {
            var viewModel = new TodoItemViewModel(todo);
            viewModel.PropertyChanged += OnTodoPropertyChanged;
            _todos.Add(viewModel);
        }

        _settings = state.Settings.Clone();
        StatusMessage = _todos.Count == 0
            ? "Ready to capture your next task."
            : $"Loaded {_todos.Count} todo item(s).";

        OnPropertyChanged(nameof(Settings));
        RaiseModePropertyChanges();
    }

    public PersistedState BuildPersistedState()
    {
        for (var index = 0; index < _todos.Count; index++)
        {
            _todos[index].SortOrder = index;
        }

        return new PersistedState
        {
            Version = 1,
            Todos = _todos.Select(todo => todo.ToModel()).ToList(),
            Settings = _settings.Clone()
        };
    }

    public void SetWidgetMode(bool isEnabled, bool requestSave = true)
    {
        if (_settings.IsWidgetModeEnabled == isEnabled)
        {
            return;
        }

        _settings.IsWidgetModeEnabled = isEnabled;

        if (!isEnabled)
        {
            _settings.DockEdge = DockEdge.None;
            _settings.IsAutoHidden = false;
        }

        RaiseModePropertyChanges();
        SetStatusMessage(isEnabled ? "Widget mode enabled." : "Widget mode disabled.");

        if (requestSave)
        {
            RequestStateSave();
        }
    }

    public void SetDockEdge(DockEdge edge, bool requestSave = true)
    {
        if (_settings.DockEdge == edge)
        {
            return;
        }

        _settings.DockEdge = edge;
        RaiseModePropertyChanges();

        if (requestSave)
        {
            RequestStateSave();
        }
    }

    public void SetAutoHidden(bool isAutoHidden, bool requestSave = true)
    {
        if (_settings.IsAutoHidden == isAutoHidden)
        {
            return;
        }

        _settings.IsAutoHidden = isAutoHidden;
        RaiseModePropertyChanges();

        if (requestSave)
        {
            RequestStateSave();
        }
    }

    public void UpdateNormalWindowPlacement(WindowPlacement placement, bool requestSave = true)
    {
        _settings.NormalWindowBounds = placement.Clone();

        if (requestSave)
        {
            RequestStateSave();
        }
    }

    public void UpdateWidgetWindowPlacement(WindowPlacement placement, bool requestSave = true)
    {
        _settings.WidgetWindowBounds = placement.Clone();

        if (requestSave)
        {
            RequestStateSave();
        }
    }

    public void SetStatusMessage(string message)
    {
        StatusMessage = message;
    }

    private bool CanAddTodo()
    {
        return !string.IsNullOrWhiteSpace(NewTodoTitle);
    }

    private void AddTodo()
    {
        var title = NewTodoTitle.Trim();

        if (string.IsNullOrWhiteSpace(title))
        {
            SetStatusMessage("Todo title cannot be empty.");
            return;
        }

        var todoViewModel = new TodoItemViewModel(new TodoItem
        {
            Title = title,
            SortOrder = _todos.Count
        });

        todoViewModel.PropertyChanged += OnTodoPropertyChanged;
        _todos.Add(todoViewModel);
        SelectedTodo = todoViewModel;
        NewTodoTitle = string.Empty;
        SetStatusMessage($"Added '{todoViewModel.Title}'.");
        RequestStateSave();
    }

    private bool CanSaveSelectedTodo()
    {
        return SelectedTodo is not null && !string.IsNullOrWhiteSpace(EditTodoTitle);
    }

    private void SaveSelectedTodo()
    {
        if (SelectedTodo is null)
        {
            SetStatusMessage("Select a todo before editing.");
            return;
        }

        if (!SelectedTodo.TryUpdateTitle(EditTodoTitle))
        {
            EditTodoTitle = SelectedTodo.Title;
            SetStatusMessage("Todo title cannot be empty.");
            return;
        }

        EditTodoTitle = SelectedTodo.Title;
        SetStatusMessage("Selected todo updated.");
        RequestStateSave();
    }

    private bool CanDeleteSelectedTodo()
    {
        return SelectedTodo is not null;
    }

    private void DeleteSelectedTodo()
    {
        DeleteTodo(SelectedTodo);
    }

    private void DeleteTodo(TodoItemViewModel? todo)
    {
        if (todo is null)
        {
            return;
        }

        todo.PropertyChanged -= OnTodoPropertyChanged;
        _todos.Remove(todo);

        if (ReferenceEquals(SelectedTodo, todo))
        {
            SelectedTodo = null;
        }

        SetStatusMessage($"Deleted '{todo.Title}'.");
        RequestStateSave();
    }

    private void ToggleWidgetMode()
    {
        SetWidgetMode(!IsWidgetMode);
    }

    private void OnTodosCollectionChanged(object? sender, NotifyCollectionChangedEventArgs e)
    {
        OnPropertyChanged(nameof(Todos));
    }

    private void OnTodoPropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (sender is not TodoItemViewModel todo)
        {
            return;
        }

        if (ReferenceEquals(todo, SelectedTodo))
        {
            EditTodoTitle = todo.Title;
        }

        if (e.PropertyName == nameof(TodoItemViewModel.IsCompleted))
        {
            SetStatusMessage(todo.IsCompleted
                ? $"Completed '{todo.Title}'."
                : $"Marked '{todo.Title}' as active.");
        }

        RequestStateSave();
    }

    private void RaiseModePropertyChanges()
    {
        OnPropertyChanged(nameof(IsWidgetMode));
        OnPropertyChanged(nameof(IsAutoHidden));
        OnPropertyChanged(nameof(IsDocked));
        OnPropertyChanged(nameof(ToggleWidgetModeButtonText));
        OnPropertyChanged(nameof(ModeSummary));
    }

    private void RequestStateSave()
    {
        StateChanged?.Invoke(this, EventArgs.Empty);
    }
}

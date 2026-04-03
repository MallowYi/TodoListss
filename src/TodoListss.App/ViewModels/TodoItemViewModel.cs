using CommunityToolkit.Mvvm.ComponentModel;
using TodoListss.App.Models;

namespace TodoListss.App.ViewModels;

public sealed class TodoItemViewModel : ObservableObject
{
    private string _title;
    private bool _isCompleted;
    private string? _notes;
    private DateTimeOffset _updatedAtUtc;
    private int _sortOrder;

    public TodoItemViewModel(TodoItem model)
    {
        Id = model.Id;
        _title = model.Title;
        _isCompleted = model.IsCompleted;
        _notes = model.Notes;
        CreatedAtUtc = model.CreatedAtUtc;
        _updatedAtUtc = model.UpdatedAtUtc;
        _sortOrder = model.SortOrder;
    }

    public Guid Id { get; }

    public string Title
    {
        get => _title;
        private set => SetProperty(ref _title, value);
    }

    public bool IsCompleted
    {
        get => _isCompleted;
        set
        {
            if (SetProperty(ref _isCompleted, value))
            {
                UpdatedAtUtc = DateTimeOffset.UtcNow;
            }
        }
    }

    public string? Notes
    {
        get => _notes;
        set
        {
            if (SetProperty(ref _notes, value))
            {
                UpdatedAtUtc = DateTimeOffset.UtcNow;
            }
        }
    }

    public DateTimeOffset CreatedAtUtc { get; }

    public DateTimeOffset UpdatedAtUtc
    {
        get => _updatedAtUtc;
        private set => SetProperty(ref _updatedAtUtc, value);
    }

    public int SortOrder
    {
        get => _sortOrder;
        set => SetProperty(ref _sortOrder, value);
    }

    public bool TryUpdateTitle(string candidateTitle)
    {
        var trimmedTitle = candidateTitle.Trim();

        if (string.IsNullOrWhiteSpace(trimmedTitle))
        {
            return false;
        }

        Title = trimmedTitle;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
        return true;
    }

    public TodoItem ToModel()
    {
        return new TodoItem
        {
            Id = Id,
            Title = Title,
            IsCompleted = IsCompleted,
            Notes = Notes,
            CreatedAtUtc = CreatedAtUtc,
            UpdatedAtUtc = UpdatedAtUtc,
            SortOrder = SortOrder
        };
    }
}

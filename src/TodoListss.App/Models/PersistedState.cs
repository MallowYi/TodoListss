namespace TodoListss.App.Models;

public sealed class PersistedState
{
    public int Version { get; set; } = 1;

    public List<TodoItem> Todos { get; set; } = [];

    public AppSettings Settings { get; set; } = new();

    public static PersistedState CreateDefault() => new();
}

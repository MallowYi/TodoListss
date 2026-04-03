using System.IO;
using System.Text.Json;
using TodoListss.App.Models;

namespace TodoListss.App.Services;

public sealed class PersistenceService
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    public PersistenceService(string? stateFilePath = null)
    {
        StateFilePath = stateFilePath ?? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "TodoListss",
            "state.json");
    }

    public string StateFilePath { get; }

    public PersistedState Load()
    {
        if (!File.Exists(StateFilePath))
        {
            return PersistedState.CreateDefault();
        }

        try
        {
            var json = File.ReadAllText(StateFilePath);
            var state = JsonSerializer.Deserialize<PersistedState>(json, SerializerOptions);

            if (state is null)
            {
                throw new PersistenceException("The saved TodoListss state file is empty or invalid.");
            }

            state.Todos ??= [];
            state.Settings ??= new AppSettings();
            state.Settings.NormalWindowBounds ??= WindowPlacement.CreateDefaultNormal();
            state.Settings.WidgetWindowBounds ??= WindowPlacement.CreateDefaultWidget();

            return state;
        }
        catch (JsonException exception)
        {
            var backupPath = BackupCorruptedFile();

            throw new PersistenceException(
                $"The saved TodoListss data could not be read. A backup was created at '{backupPath}'.",
                exception);
        }
        catch (IOException exception)
        {
            throw new PersistenceException(
                "TodoListss could not read the local state file.",
                exception);
        }
    }

    public void Save(PersistedState state)
    {
        try
        {
            var directory = Path.GetDirectoryName(StateFilePath);

            if (string.IsNullOrWhiteSpace(directory))
            {
                throw new PersistenceException("TodoListss could not determine where to save its state file.");
            }

            Directory.CreateDirectory(directory);

            var tempFilePath = $"{StateFilePath}.tmp";
            var json = JsonSerializer.Serialize(state, SerializerOptions);
            File.WriteAllText(tempFilePath, json);
            File.Move(tempFilePath, StateFilePath, overwrite: true);
        }
        catch (PersistenceException)
        {
            throw;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or NotSupportedException)
        {
            throw new PersistenceException(
                "TodoListss could not save the local state file.",
                exception);
        }
    }

    private string BackupCorruptedFile()
    {
        var backupPath = $"{StateFilePath}.corrupt-{DateTime.UtcNow:yyyyMMddHHmmss}.bak";
        Directory.CreateDirectory(Path.GetDirectoryName(StateFilePath)!);
        File.Copy(StateFilePath, backupPath, overwrite: true);
        return backupPath;
    }
}

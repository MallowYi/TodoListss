using TodoListss.App.Models;
using TodoListss.App.Services;

namespace TodoListss.App.Tests.Services;

public sealed class PersistenceServiceTests : IDisposable
{
    private readonly string _tempDirectory;

    public PersistenceServiceTests()
    {
        _tempDirectory = Path.Combine(Path.GetTempPath(), $"TodoListss.Tests.{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDirectory);
    }

    [Fact]
    public void SaveAndLoad_RoundTripsState()
    {
        var filePath = Path.Combine(_tempDirectory, "state.json");
        var service = new PersistenceService(filePath);
        var state = new PersistedState
        {
            Todos =
            [
                new TodoItem
                {
                    Title = "Write tests",
                    IsCompleted = true,
                    Notes = "Round-trip validation",
                    SortOrder = 0
                }
            ],
            Settings = new AppSettings
            {
                IsWidgetModeEnabled = true,
                DockEdge = DockEdge.Left,
                PeekThickness = 10
            }
        };

        service.Save(state);
        var loaded = service.Load();

        Assert.Single(loaded.Todos);
        Assert.Equal("Write tests", loaded.Todos[0].Title);
        Assert.True(loaded.Todos[0].IsCompleted);
        Assert.Equal("Round-trip validation", loaded.Todos[0].Notes);
        Assert.True(loaded.Settings.IsWidgetModeEnabled);
        Assert.Equal(DockEdge.Left, loaded.Settings.DockEdge);
        Assert.Equal(10, loaded.Settings.PeekThickness);
    }

    [Fact]
    public void Load_WhenJsonIsInvalid_ThrowsPersistenceExceptionAndCreatesBackup()
    {
        var filePath = Path.Combine(_tempDirectory, "state.json");
        File.WriteAllText(filePath, "{ invalid json");

        var service = new PersistenceService(filePath);

        var exception = Assert.Throws<PersistenceException>(service.Load);

        Assert.Contains("backup was created", exception.Message, StringComparison.OrdinalIgnoreCase);
        Assert.NotEmpty(Directory.GetFiles(_tempDirectory, "*.bak"));
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDirectory))
        {
            Directory.Delete(_tempDirectory, recursive: true);
        }
    }
}

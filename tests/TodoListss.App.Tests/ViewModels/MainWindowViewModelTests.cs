using TodoListss.App.Models;
using TodoListss.App.ViewModels;

namespace TodoListss.App.Tests.ViewModels;

public sealed class MainWindowViewModelTests
{
    [Fact]
    public void AddTodoCommand_AddsTrimmedTodoAndClearsInput()
    {
        var viewModel = new MainWindowViewModel
        {
            NewTodoTitle = "  Buy milk  "
        };

        viewModel.AddTodoCommand.Execute(null);

        Assert.Single(viewModel.Todos);
        Assert.Equal("Buy milk", viewModel.Todos[0].Title);
        Assert.Equal(string.Empty, viewModel.NewTodoTitle);
    }

    [Fact]
    public void SaveSelectedTodoCommand_UpdatesSelectedTodoTitle()
    {
        var viewModel = new MainWindowViewModel();
        viewModel.LoadState(new PersistedState
        {
            Todos =
            [
                new TodoItem { Title = "Old title", SortOrder = 0 }
            ]
        });

        viewModel.SelectedTodo = viewModel.Todos[0];
        viewModel.EditTodoTitle = "New title";
        viewModel.SaveSelectedTodoCommand.Execute(null);

        Assert.Equal("New title", viewModel.Todos[0].Title);
    }

    [Fact]
    public void ToggleWidgetModeCommand_TogglesWidgetMode()
    {
        var viewModel = new MainWindowViewModel();

        viewModel.ToggleWidgetModeCommand.Execute(null);

        Assert.True(viewModel.IsWidgetMode);

        viewModel.ToggleWidgetModeCommand.Execute(null);

        Assert.False(viewModel.IsWidgetMode);
    }
}

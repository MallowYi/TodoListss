using System.Windows;
using TodoListss.App.Models;
using TodoListss.App.Services;
using TodoListss.App.ViewModels;

namespace TodoListss.App;

public partial class App : System.Windows.Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        var persistenceService = new PersistenceService();
        var dockingService = new DockingService();
        var windowStateRecoveryService = new WindowStateRecoveryService();
        var widgetModeService = new WidgetModeService();
        var cursorMonitorService = new CursorMonitorService();

        PersistedState initialState;

        try
        {
            initialState = persistenceService.Load();
        }
        catch (PersistenceException exception)
        {
            System.Windows.MessageBox.Show(
                exception.Message,
                "TodoListss",
                MessageBoxButton.OK,
                MessageBoxImage.Warning);

            initialState = PersistedState.CreateDefault();
        }

        var viewModel = new MainWindowViewModel();
        viewModel.LoadState(initialState);

        var mainWindow = new MainWindow(
            viewModel,
            persistenceService,
            dockingService,
            windowStateRecoveryService,
            widgetModeService,
            cursorMonitorService);

        MainWindow = mainWindow;
        mainWindow.Show();
    }
}


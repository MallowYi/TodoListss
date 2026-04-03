using System.ComponentModel;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using TodoListss.App.Infrastructure;
using TodoListss.App.Models;
using TodoListss.App.Services;
using TodoListss.App.ViewModels;
using Point = System.Windows.Point;
using WpfKeyEventArgs = System.Windows.Input.KeyEventArgs;

namespace TodoListss.App;

public partial class MainWindow : Window
{
    private static readonly TimeSpan WindowAnimationDuration = TimeSpan.FromMilliseconds(140);

    private readonly MainWindowViewModel _viewModel;
    private readonly PersistenceService _persistenceService;
    private readonly DockingService _dockingService;
    private readonly WindowStateRecoveryService _windowStateRecoveryService;
    private readonly WidgetModeService _widgetModeService;
    private readonly CursorMonitorService _cursorMonitorService;

    private bool _isInitialized;
    private bool _isDockAnimationRunning;
    private bool _suppressPlacementTracking;
    private bool _suppressModeReaction;

    public MainWindow(
        MainWindowViewModel viewModel,
        PersistenceService persistenceService,
        DockingService dockingService,
        WindowStateRecoveryService windowStateRecoveryService,
        WidgetModeService widgetModeService,
        CursorMonitorService cursorMonitorService)
    {
        _viewModel = viewModel;
        _persistenceService = persistenceService;
        _dockingService = dockingService;
        _windowStateRecoveryService = windowStateRecoveryService;
        _widgetModeService = widgetModeService;
        _cursorMonitorService = cursorMonitorService;

        InitializeComponent();

        DataContext = _viewModel;

        Loaded += OnLoaded;
        Closing += OnClosing;
        LocationChanged += OnWindowPlacementChanged;
        SizeChanged += OnWindowPlacementChanged;
        Activated += OnActivated;
        Deactivated += OnDeactivated;

        _viewModel.PropertyChanged += OnViewModelPropertyChanged;
        _viewModel.StateChanged += OnViewModelStateChanged;
        _cursorMonitorService.CursorPositionChanged += OnCursorPositionChanged;
    }

    private void OnLoaded(object sender, RoutedEventArgs e)
    {
        ApplyInitialWindowMode();
        _cursorMonitorService.Start();
        _isInitialized = true;
    }

    private void OnClosing(object? sender, CancelEventArgs e)
    {
        _cursorMonitorService.Stop();

        if (_viewModel.IsWidgetMode && !_viewModel.IsAutoHidden)
        {
            _viewModel.UpdateWidgetWindowPlacement(WindowPlacement.FromWindow(this), requestSave: false);
        }
        else if (!_viewModel.IsWidgetMode)
        {
            _viewModel.UpdateNormalWindowPlacement(WindowPlacement.FromWindow(this), requestSave: false);
        }

        SaveStateSafely();
    }

    private void OnActivated(object? sender, EventArgs e)
    {
        if (_viewModel.IsWidgetMode)
        {
            _widgetModeService.RefreshTopmost(this);
        }
    }

    private void OnDeactivated(object? sender, EventArgs e)
    {
        if (_viewModel.IsWidgetMode)
        {
            _widgetModeService.RefreshTopmost(this);
        }
    }

    private void OnViewModelStateChanged(object? sender, EventArgs e)
    {
        if (_isInitialized)
        {
            SaveStateSafely();
        }
    }

    private void OnViewModelPropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (!_isInitialized || _suppressModeReaction)
        {
            return;
        }

        if (e.PropertyName == nameof(MainWindowViewModel.IsWidgetMode))
        {
            if (_viewModel.IsWidgetMode)
            {
                EnterWidgetMode(saveState: true);
            }
            else
            {
                ExitWidgetMode(saveState: true);
            }
        }
    }

    private void OnWindowPlacementChanged(object? sender, EventArgs e)
    {
        if (!_isInitialized || _suppressPlacementTracking || _isDockAnimationRunning)
        {
            return;
        }

        var placement = WindowPlacement.FromWindow(this);

        if (_viewModel.IsWidgetMode)
        {
            if (!_viewModel.IsAutoHidden)
            {
                _viewModel.UpdateWidgetWindowPlacement(placement, requestSave: false);
                UpdateDockingState(placement);
            }
        }
        else if (WindowState == WindowState.Normal)
        {
            _viewModel.UpdateNormalWindowPlacement(placement, requestSave: false);
        }
    }

    private void OnCursorPositionChanged(System.Drawing.Point rawCursorPosition)
    {
        if (!_isInitialized || !_viewModel.IsWidgetMode || _viewModel.Settings.DockEdge == DockEdge.None || _isDockAnimationRunning)
        {
            return;
        }

        var screens = GetCurrentScreens();
        var dockingResult = _dockingService.GetDockingResult(
            _viewModel.Settings.WidgetWindowBounds,
            screens,
            _viewModel.Settings.PeekThickness);

        if (dockingResult is null)
        {
            return;
        }

        var cursorPosition = ConvertCursorToDip(rawCursorPosition);

        if (_viewModel.IsAutoHidden)
        {
            if (_dockingService.ShouldReveal(dockingResult, cursorPosition))
            {
                _ = RevealDockedWidgetAsync(dockingResult);
            }

            return;
        }

        if (_dockingService.ShouldAutoHide(dockingResult, cursorPosition, IsActive))
        {
            _ = HideDockedWidgetAsync(dockingResult);
        }
    }

    private void WidgetDragHandle_OnPreviewMouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (!_viewModel.IsWidgetMode || e.ButtonState != MouseButtonState.Pressed)
        {
            return;
        }

        try
        {
            DragMove();
            EvaluateDockingAfterDrag();
        }
        catch
        {
            // Ignore drag cancellation caused by the mouse state changing mid-drag.
        }
    }

    private void NewTodoInput_OnKeyDown(object sender, WpfKeyEventArgs e)
    {
        if (e.Key == Key.Enter && _viewModel.AddTodoCommand.CanExecute(null))
        {
            _viewModel.AddTodoCommand.Execute(null);
            e.Handled = true;
        }
    }

    private void EditTodoInput_OnKeyDown(object sender, WpfKeyEventArgs e)
    {
        if (e.Key == Key.Enter && _viewModel.SaveSelectedTodoCommand.CanExecute(null))
        {
            _viewModel.SaveSelectedTodoCommand.Execute(null);
            e.Handled = true;
        }
    }

    private void CloseButton_OnClick(object sender, RoutedEventArgs e)
    {
        Close();
    }

    private void ApplyInitialWindowMode()
    {
        _suppressModeReaction = true;

        try
        {
            if (_viewModel.IsWidgetMode)
            {
                EnterWidgetMode(saveState: false);
                _viewModel.SetAutoHidden(false, requestSave: false);
            }
            else
            {
                ExitWidgetMode(saveState: false);
            }
        }
        finally
        {
            _suppressModeReaction = false;
        }
    }

    private void EnterWidgetMode(bool saveState)
    {
        if (!_viewModel.IsWidgetMode)
        {
            _viewModel.SetWidgetMode(true, requestSave: false);
        }

        var screens = GetCurrentScreens();
        var widgetPlacement = _widgetModeService.ResolveWidgetPlacement(
            _viewModel.Settings.WidgetWindowBounds,
            screens,
            _windowStateRecoveryService);

        _widgetModeService.ConfigureForWidgetMode(this);
        ApplyPlacementInstant(widgetPlacement);
        _viewModel.UpdateWidgetWindowPlacement(widgetPlacement, requestSave: false);
        UpdateDockingState(widgetPlacement);
        _widgetModeService.RefreshTopmost(this);

        if (saveState)
        {
            SaveStateSafely();
        }
    }

    private void ExitWidgetMode(bool saveState)
    {
        var screens = GetCurrentScreens();
        var normalPlacement = _windowStateRecoveryService.EnsureVisible(
            _viewModel.Settings.NormalWindowBounds,
            screens,
            WindowPlacement.CreateDefaultNormal());

        _viewModel.SetAutoHidden(false, requestSave: false);
        _viewModel.SetDockEdge(DockEdge.None, requestSave: false);
        _widgetModeService.ConfigureForNormalMode(this);
        ApplyPlacementInstant(normalPlacement);
        _viewModel.UpdateNormalWindowPlacement(normalPlacement, requestSave: false);

        if (saveState)
        {
            SaveStateSafely();
        }
    }

    private void EvaluateDockingAfterDrag()
    {
        var screens = GetCurrentScreens();
        var result = _dockingService.GetDockingResult(
            WindowPlacement.FromWindow(this),
            screens,
            _viewModel.Settings.PeekThickness);

        if (result is null)
        {
            _viewModel.SetDockEdge(DockEdge.None, requestSave: false);
            _viewModel.SetAutoHidden(false, requestSave: false);
            _viewModel.UpdateWidgetWindowPlacement(WindowPlacement.FromWindow(this), requestSave: false);
            SaveStateSafely();
            return;
        }

        _ = HideDockedWidgetAsync(result);
    }

    private void UpdateDockingState(WindowPlacement placement)
    {
        var result = _dockingService.GetDockingResult(
            placement,
            GetCurrentScreens(),
            _viewModel.Settings.PeekThickness);

        _viewModel.SetDockEdge(result?.Edge ?? DockEdge.None, requestSave: false);
    }

    private async Task HideDockedWidgetAsync(DockingResult dockingResult)
    {
        if (_viewModel.IsAutoHidden || _isDockAnimationRunning)
        {
            return;
        }

        _isDockAnimationRunning = true;

        try
        {
            _viewModel.SetDockEdge(dockingResult.Edge, requestSave: false);
            _viewModel.UpdateWidgetWindowPlacement(dockingResult.VisiblePlacement, requestSave: false);
            _viewModel.SetAutoHidden(true, requestSave: false);

            await ApplyPlacementAsync(dockingResult.HiddenPlacement, animate: true);
            _widgetModeService.RefreshTopmost(this);
            SaveStateSafely();
        }
        finally
        {
            _isDockAnimationRunning = false;
        }
    }

    private async Task RevealDockedWidgetAsync(DockingResult dockingResult)
    {
        if (!_viewModel.IsAutoHidden || _isDockAnimationRunning)
        {
            return;
        }

        _isDockAnimationRunning = true;

        try
        {
            _viewModel.UpdateWidgetWindowPlacement(dockingResult.VisiblePlacement, requestSave: false);
            _viewModel.SetAutoHidden(false, requestSave: false);

            await ApplyPlacementAsync(dockingResult.VisiblePlacement, animate: true);
            _widgetModeService.RefreshTopmost(this);
            SaveStateSafely();
        }
        finally
        {
            _isDockAnimationRunning = false;
        }
    }

    private async Task ApplyPlacementAsync(WindowPlacement placement, bool animate)
    {
        _suppressPlacementTracking = true;

        Width = placement.Width;
        Height = placement.Height;

        if (animate)
        {
            BeginAnimation(LeftProperty, CreateWindowAnimation(placement.Left));
            BeginAnimation(TopProperty, CreateWindowAnimation(placement.Top));
            await Task.Delay(WindowAnimationDuration);
            BeginAnimation(LeftProperty, null);
            BeginAnimation(TopProperty, null);
        }

        Left = placement.Left;
        Top = placement.Top;
        _suppressPlacementTracking = false;
    }

    private void ApplyPlacementInstant(WindowPlacement placement)
    {
        _suppressPlacementTracking = true;
        Left = placement.Left;
        Top = placement.Top;
        Width = placement.Width;
        Height = placement.Height;
        _suppressPlacementTracking = false;
    }

    private void SaveStateSafely()
    {
        try
        {
            _persistenceService.Save(_viewModel.BuildPersistedState());
        }
        catch (PersistenceException exception)
        {
            _viewModel.SetStatusMessage(exception.Message);

            System.Windows.MessageBox.Show(
                exception.Message,
                "TodoListss",
                MessageBoxButton.OK,
                MessageBoxImage.Warning);
        }
    }

    private IReadOnlyList<ScreenGeometry> GetCurrentScreens()
    {
        var dpi = VisualTreeHelper.GetDpi(this);
        return ScreenGeometry.GetAllScreens(dpi.DpiScaleX, dpi.DpiScaleY);
    }

    private Point ConvertCursorToDip(System.Drawing.Point cursorPosition)
    {
        var dpi = VisualTreeHelper.GetDpi(this);
        return new Point(cursorPosition.X / dpi.DpiScaleX, cursorPosition.Y / dpi.DpiScaleY);
    }

    private static DoubleAnimation CreateWindowAnimation(double target)
    {
        return new DoubleAnimation
        {
            To = target,
            Duration = WindowAnimationDuration,
            EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseOut }
        };
    }
}

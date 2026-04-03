using System.Windows.Threading;
using TodoListss.App.Infrastructure;

namespace TodoListss.App.Services;

public sealed class CursorMonitorService
{
    private readonly DispatcherTimer _timer;

    public CursorMonitorService()
    {
        _timer = new DispatcherTimer(
            TimeSpan.FromMilliseconds(100),
            DispatcherPriority.Background,
            OnTick,
            Dispatcher.CurrentDispatcher);
    }

    public event Action<System.Drawing.Point>? CursorPositionChanged;

    public void Start()
    {
        if (!_timer.IsEnabled)
        {
            _timer.Start();
        }
    }

    public void Stop()
    {
        if (_timer.IsEnabled)
        {
            _timer.Stop();
        }
    }

    private void OnTick(object? sender, EventArgs e)
    {
        CursorPositionChanged?.Invoke(NativeMethods.GetCursorPosition());
    }
}

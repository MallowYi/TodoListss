using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Interop;
using WpfWindow = System.Windows.Window;

namespace TodoListss.App.Infrastructure;

internal static class NativeMethods
{
    private const uint SwpNoMove = 0x0002;
    private const uint SwpNoSize = 0x0001;
    private const uint SwpNoActivate = 0x0010;
    private const uint SwpShowWindow = 0x0040;

    private static readonly nint HwndTopmost = new(-1);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool GetCursorPos(out NativePoint point);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool SetWindowPos(
        nint hWnd,
        nint hWndInsertAfter,
        int x,
        int y,
        int cx,
        int cy,
        uint flags);

    public static System.Drawing.Point GetCursorPosition()
    {
        return GetCursorPos(out var point)
            ? new System.Drawing.Point(point.X, point.Y)
            : System.Drawing.Point.Empty;
    }

    public static void RefreshTopmost(WpfWindow window)
    {
        var handle = new WindowInteropHelper(window).Handle;

        if (handle == nint.Zero)
        {
            return;
        }

        SetWindowPos(
            handle,
            HwndTopmost,
            0,
            0,
            0,
            0,
            SwpNoMove | SwpNoSize | SwpNoActivate | SwpShowWindow);
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct NativePoint
    {
        public int X;
        public int Y;
    }
}

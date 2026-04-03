using System.Windows;
using System.Windows.Forms;

namespace TodoListss.App.Infrastructure;

public readonly record struct ScreenGeometry(Rect WorkArea)
{
    public static IReadOnlyList<ScreenGeometry> GetAllScreens(double dpiScaleX, double dpiScaleY)
    {
        return Screen.AllScreens
            .Select(screen => new ScreenGeometry(
                new Rect(
                    screen.WorkingArea.Left / dpiScaleX,
                    screen.WorkingArea.Top / dpiScaleY,
                    screen.WorkingArea.Width / dpiScaleX,
                    screen.WorkingArea.Height / dpiScaleY)))
            .ToArray();
    }
}

using System.Windows;
using TodoListss.App.Infrastructure;
using TodoListss.App.Models;

namespace TodoListss.App.Services;

public sealed class WindowStateRecoveryService
{
    public WindowPlacement EnsureVisible(
        WindowPlacement placement,
        IReadOnlyList<ScreenGeometry> screens,
        WindowPlacement fallbackPlacement)
    {
        if (placement.Width <= 0 || placement.Height <= 0)
        {
            return fallbackPlacement.Clone();
        }

        if (screens.Count == 0)
        {
            return fallbackPlacement.Clone();
        }

        var rect = placement.ToRect();
        var bestScreen = screens
            .OrderByDescending(screen => IntersectionArea(rect, screen.WorkArea))
            .First();

        if (IntersectionArea(rect, bestScreen.WorkArea) > 0)
        {
            return ClampToScreen(placement, bestScreen.WorkArea);
        }

        return ClampToScreen(fallbackPlacement, bestScreen.WorkArea);
    }

    private static WindowPlacement ClampToScreen(WindowPlacement placement, Rect workArea)
    {
        var width = Math.Min(placement.Width, workArea.Width);
        var height = Math.Min(placement.Height, workArea.Height);
        var left = Math.Min(Math.Max(placement.Left, workArea.Left), workArea.Right - width);
        var top = Math.Min(Math.Max(placement.Top, workArea.Top), workArea.Bottom - height);

        return new WindowPlacement
        {
            Left = left,
            Top = top,
            Width = width,
            Height = height
        };
    }

    private static double IntersectionArea(Rect first, Rect second)
    {
        var intersection = Rect.Intersect(first, second);
        return intersection.IsEmpty ? 0 : intersection.Width * intersection.Height;
    }
}

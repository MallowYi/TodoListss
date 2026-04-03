using System.Windows;
using System.Windows.Shell;
using TodoListss.App.Infrastructure;
using TodoListss.App.Models;

namespace TodoListss.App.Services;

public sealed class WidgetModeService
{
    private const double WidgetMinWidth = 220;
    private const double WidgetMinHeight = 180;
    private const double LegacyWidgetWidth = 360;
    private const double LegacyWidgetHeight = 480;
    private static readonly Thickness WidgetResizeBorder = new(6);

    public void ConfigureForWidgetMode(Window window)
    {
        window.WindowStyle = WindowStyle.None;
        window.ResizeMode = ResizeMode.CanResize;
        window.Topmost = true;
        window.MinWidth = WidgetMinWidth;
        window.MinHeight = WidgetMinHeight;
        WindowChrome.SetWindowChrome(window, CreateWidgetWindowChrome());
    }

    public void ConfigureForNormalMode(Window window)
    {
        WindowChrome.SetWindowChrome(window, null);
        window.WindowStyle = WindowStyle.SingleBorderWindow;
        window.ResizeMode = ResizeMode.CanResizeWithGrip;
        window.Topmost = false;
        window.MinWidth = 360;
        window.MinHeight = 480;
    }

    public WindowPlacement ResolveWidgetPlacement(
        WindowPlacement preferredPlacement,
        IReadOnlyList<ScreenGeometry> screens,
        WindowStateRecoveryService recoveryService)
    {
        var candidate = preferredPlacement.Clone();
        var fallbackPlacement = WindowPlacement.CreateDefaultWidget();
        var shouldResetToCompactDefault = IsLegacyWidgetDefault(candidate);

        if (shouldResetToCompactDefault || candidate.Width <= 0 || candidate.Width > 540)
        {
            candidate.Width = fallbackPlacement.Width;
        }

        if (shouldResetToCompactDefault || candidate.Height <= 0 || candidate.Height > 720)
        {
            candidate.Height = fallbackPlacement.Height;
        }

        candidate.Width = Math.Max(candidate.Width, WidgetMinWidth);
        candidate.Height = Math.Max(candidate.Height, WidgetMinHeight);

        return recoveryService.EnsureVisible(candidate, screens, fallbackPlacement);
    }

    public void RefreshTopmost(Window window)
    {
        window.Topmost = true;
        NativeMethods.RefreshTopmost(window);
    }

    private static WindowChrome CreateWidgetWindowChrome()
    {
        return new WindowChrome
        {
            CaptionHeight = 0,
            CornerRadius = new CornerRadius(14),
            GlassFrameThickness = new Thickness(0),
            NonClientFrameEdges = NonClientFrameEdges.None,
            ResizeBorderThickness = WidgetResizeBorder,
            UseAeroCaptionButtons = false
        };
    }

    private static bool IsLegacyWidgetDefault(WindowPlacement placement)
    {
        return Math.Abs(placement.Width - LegacyWidgetWidth) < 0.5
            && Math.Abs(placement.Height - LegacyWidgetHeight) < 0.5;
    }
}

using System.Windows;
using TodoListss.App.Infrastructure;
using TodoListss.App.Models;
using WpfPoint = System.Windows.Point;

namespace TodoListss.App.Services;

public sealed class DockingService
{
    private const double DockThreshold = 40;
    private const double RevealZoneThickness = 12;
    private const double AutoHidePadding = 10;

    public DockingResult? GetDockingResult(
        WindowPlacement currentPlacement,
        IReadOnlyList<ScreenGeometry> screens,
        double peekThickness)
    {
        if (screens.Count == 0)
        {
            return null;
        }

        var screen = GetBestMatchingScreen(currentPlacement, screens);
        var rect = currentPlacement.ToRect();
        var leftDistance = Math.Abs(rect.Left - screen.WorkArea.Left);
        var rightDistance = Math.Abs(screen.WorkArea.Right - rect.Right);
        var topDistance = Math.Abs(rect.Top - screen.WorkArea.Top);
        var bottomDistance = Math.Abs(screen.WorkArea.Bottom - rect.Bottom);

        var closestDistance = Math.Min(
            Math.Min(leftDistance, rightDistance),
            Math.Min(topDistance, bottomDistance));

        if (closestDistance > DockThreshold)
        {
            return null;
        }

        var edge = closestDistance == leftDistance
            ? DockEdge.Left
            : closestDistance == rightDistance
                ? DockEdge.Right
                : closestDistance == topDistance
                    ? DockEdge.Top
                    : DockEdge.Bottom;

        var visiblePlacement = SnapToEdge(currentPlacement, screen.WorkArea, edge);
        var hiddenPlacement = CreateHiddenPlacement(visiblePlacement, screen.WorkArea, edge, peekThickness);
        var revealZone = CreateRevealZone(visiblePlacement, screen.WorkArea, edge, peekThickness);

        return new DockingResult(edge, visiblePlacement, hiddenPlacement, revealZone);
    }

    public bool ShouldReveal(DockingResult dockingResult, WpfPoint cursorPosition)
    {
        return dockingResult.RevealZone.Contains(cursorPosition);
    }

    public bool ShouldAutoHide(DockingResult dockingResult, WpfPoint cursorPosition, bool windowIsActive)
    {
        var visibleRect = dockingResult.VisiblePlacement.ToRect();
        visibleRect.Inflate(AutoHidePadding, AutoHidePadding);

        return !windowIsActive && !visibleRect.Contains(cursorPosition);
    }

    private static WindowPlacement SnapToEdge(WindowPlacement placement, Rect workArea, DockEdge edge)
    {
        var snapped = placement.Clone();

        switch (edge)
        {
            case DockEdge.Left:
                snapped.Left = workArea.Left;
                snapped.Top = Clamp(snapped.Top, workArea.Top, workArea.Bottom - snapped.Height);
                break;

            case DockEdge.Right:
                snapped.Left = workArea.Right - snapped.Width;
                snapped.Top = Clamp(snapped.Top, workArea.Top, workArea.Bottom - snapped.Height);
                break;

            case DockEdge.Top:
                snapped.Left = Clamp(snapped.Left, workArea.Left, workArea.Right - snapped.Width);
                snapped.Top = workArea.Top;
                break;

            case DockEdge.Bottom:
                snapped.Left = Clamp(snapped.Left, workArea.Left, workArea.Right - snapped.Width);
                snapped.Top = workArea.Bottom - snapped.Height;
                break;
        }

        return snapped;
    }

    private static WindowPlacement CreateHiddenPlacement(
        WindowPlacement visiblePlacement,
        Rect workArea,
        DockEdge edge,
        double peekThickness)
    {
        var hidden = visiblePlacement.Clone();

        switch (edge)
        {
            case DockEdge.Left:
                hidden.Left = workArea.Left - visiblePlacement.Width + peekThickness;
                break;

            case DockEdge.Right:
                hidden.Left = workArea.Right - peekThickness;
                break;

            case DockEdge.Top:
                hidden.Top = workArea.Top - visiblePlacement.Height + peekThickness;
                break;

            case DockEdge.Bottom:
                hidden.Top = workArea.Bottom - peekThickness;
                break;
        }

        return hidden;
    }

    private static Rect CreateRevealZone(
        WindowPlacement visiblePlacement,
        Rect workArea,
        DockEdge edge,
        double peekThickness)
    {
        var triggerThickness = Math.Max(peekThickness + 4, RevealZoneThickness);

        return edge switch
        {
            DockEdge.Left => new Rect(workArea.Left, visiblePlacement.Top, triggerThickness, visiblePlacement.Height),
            DockEdge.Right => new Rect(workArea.Right - triggerThickness, visiblePlacement.Top, triggerThickness, visiblePlacement.Height),
            DockEdge.Top => new Rect(visiblePlacement.Left, workArea.Top, visiblePlacement.Width, triggerThickness),
            DockEdge.Bottom => new Rect(visiblePlacement.Left, workArea.Bottom - triggerThickness, visiblePlacement.Width, triggerThickness),
            _ => Rect.Empty
        };
    }

    private static ScreenGeometry GetBestMatchingScreen(WindowPlacement placement, IReadOnlyList<ScreenGeometry> screens)
    {
        var rect = placement.ToRect();

        return screens
            .OrderByDescending(screen => IntersectionArea(rect, screen.WorkArea))
            .First();
    }

    private static double IntersectionArea(Rect first, Rect second)
    {
        var intersection = Rect.Intersect(first, second);
        return intersection.IsEmpty ? 0 : intersection.Width * intersection.Height;
    }

    private static double Clamp(double value, double min, double max)
    {
        return Math.Min(Math.Max(value, min), max);
    }
}

public sealed record DockingResult(
    DockEdge Edge,
    WindowPlacement VisiblePlacement,
    WindowPlacement HiddenPlacement,
    Rect RevealZone);

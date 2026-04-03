using System.Windows;
using TodoListss.App.Infrastructure;
using TodoListss.App.Models;
using TodoListss.App.Services;

namespace TodoListss.App.Tests.Services;

public sealed class DockingServiceTests
{
    private static readonly ScreenGeometry[] Screens =
    [
        new(new Rect(0, 0, 1920, 1080))
    ];

    [Fact]
    public void GetDockingResult_WhenWindowNearLeftEdge_ReturnsLeftDock()
    {
        var service = new DockingService();
        var placement = new WindowPlacement
        {
            Left = 4,
            Top = 120,
            Width = 360,
            Height = 480
        };

        var result = service.GetDockingResult(placement, Screens, peekThickness: 8);

        Assert.NotNull(result);
        Assert.Equal(DockEdge.Left, result!.Edge);
        Assert.Equal(0, result.VisiblePlacement.Left);
        Assert.Equal(-352, result.HiddenPlacement.Left);
    }

    [Fact]
    public void GetDockingResult_WhenWindowAwayFromEdges_ReturnsNull()
    {
        var service = new DockingService();
        var placement = new WindowPlacement
        {
            Left = 400,
            Top = 220,
            Width = 360,
            Height = 480
        };

        var result = service.GetDockingResult(placement, Screens, peekThickness: 8);

        Assert.Null(result);
    }

    [Fact]
    public void GetDockingResult_WhenWindowIsNearEdgeWithinRelaxedThreshold_ReturnsDock()
    {
        var service = new DockingService();
        var placement = new WindowPlacement
        {
            Left = 36,
            Top = 180,
            Width = 280,
            Height = 360
        };

        var result = service.GetDockingResult(placement, Screens, peekThickness: 8);

        Assert.NotNull(result);
        Assert.Equal(DockEdge.Left, result!.Edge);
    }

    [Fact]
    public void ShouldReveal_WhenCursorTouchesRevealZone_ReturnsTrue()
    {
        var service = new DockingService();
        var placement = new WindowPlacement
        {
            Left = 0,
            Top = 100,
            Width = 360,
            Height = 480
        };
        var result = service.GetDockingResult(placement, Screens, peekThickness: 8)!;

        var shouldReveal = service.ShouldReveal(result, new Point(4, 180));

        Assert.True(shouldReveal);
    }

    [Fact]
    public void GetDockingResult_WhenWindowNearBottomEdge_ReturnsBottomDock()
    {
        var service = new DockingService();
        var placement = new WindowPlacement
        {
            Left = 320,
            Top = 1080 - 360 - 8,
            Width = 280,
            Height = 360
        };

        var result = service.GetDockingResult(placement, Screens, peekThickness: 8);

        Assert.NotNull(result);
        Assert.Equal(DockEdge.Bottom, result!.Edge);
        Assert.Equal(1080 - 360, result.VisiblePlacement.Top);
        Assert.Equal(1080 - 8, result.HiddenPlacement.Top);
    }
}

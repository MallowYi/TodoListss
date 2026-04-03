using System.Windows;
using TodoListss.App.Infrastructure;
using TodoListss.App.Models;
using TodoListss.App.Services;

namespace TodoListss.App.Tests.Services;

public sealed class WindowStateRecoveryServiceTests
{
    [Fact]
    public void EnsureVisible_WhenPlacementIsOffScreen_UsesFallbackWithinAvailableScreen()
    {
        var service = new WindowStateRecoveryService();
        var screens = new[]
        {
            new ScreenGeometry(new Rect(0, 0, 1920, 1080))
        };
        var placement = new WindowPlacement
        {
            Left = 4000,
            Top = 2000,
            Width = 400,
            Height = 300
        };
        var fallback = new WindowPlacement
        {
            Left = 100,
            Top = 100,
            Width = 500,
            Height = 600
        };

        var recovered = service.EnsureVisible(placement, screens, fallback);

        Assert.Equal(100, recovered.Left);
        Assert.Equal(100, recovered.Top);
        Assert.Equal(500, recovered.Width);
        Assert.Equal(600, recovered.Height);
    }

    [Fact]
    public void EnsureVisible_WhenPlacementIntersectsScreen_ClampsItIntoBounds()
    {
        var service = new WindowStateRecoveryService();
        var screens = new[]
        {
            new ScreenGeometry(new Rect(0, 0, 1920, 1080))
        };
        var placement = new WindowPlacement
        {
            Left = 1800,
            Top = 1000,
            Width = 400,
            Height = 200
        };

        var recovered = service.EnsureVisible(placement, screens, WindowPlacement.CreateDefaultNormal());

        Assert.Equal(1520, recovered.Left);
        Assert.Equal(880, recovered.Top);
    }
}

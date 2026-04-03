using System.Windows;
using TodoListss.App.Infrastructure;
using TodoListss.App.Models;
using TodoListss.App.Services;

namespace TodoListss.App.Tests.Services;

public sealed class WidgetModeServiceTests
{
    private static readonly ScreenGeometry[] Screens =
    [
        new(new Rect(0, 0, 1920, 1080))
    ];

    [Fact]
    public void ResolveWidgetPlacement_WhenPlacementUsesLegacyDefault_UsesCompactDefault()
    {
        var service = new WidgetModeService();
        var recoveryService = new WindowStateRecoveryService();
        var placement = new WindowPlacement
        {
            Left = 40,
            Top = 40,
            Width = 360,
            Height = 480
        };

        var resolved = service.ResolveWidgetPlacement(placement, Screens, recoveryService);

        Assert.Equal(280, resolved.Width);
        Assert.Equal(360, resolved.Height);
    }

    [Fact]
    public void ResolveWidgetPlacement_WhenPlacementIsSmallerThanMinimum_ClampsToMinimumSize()
    {
        var service = new WidgetModeService();
        var recoveryService = new WindowStateRecoveryService();
        var placement = new WindowPlacement
        {
            Left = 0,
            Top = 0,
            Width = 180,
            Height = 120
        };

        var resolved = service.ResolveWidgetPlacement(placement, Screens, recoveryService);

        Assert.Equal(220, resolved.Width);
        Assert.Equal(180, resolved.Height);
    }
}

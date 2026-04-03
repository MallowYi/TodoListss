namespace TodoListss.App.Models;

public sealed class AppSettings
{
    public bool IsWidgetModeEnabled { get; set; }

    public WindowPlacement NormalWindowBounds { get; set; } = WindowPlacement.CreateDefaultNormal();

    public WindowPlacement WidgetWindowBounds { get; set; } = WindowPlacement.CreateDefaultWidget();

    public DockEdge DockEdge { get; set; } = DockEdge.None;

    public bool IsAutoHidden { get; set; }

    public double PeekThickness { get; set; } = 8;

    public AppSettings Clone()
    {
        return new AppSettings
        {
            IsWidgetModeEnabled = IsWidgetModeEnabled,
            NormalWindowBounds = NormalWindowBounds.Clone(),
            WidgetWindowBounds = WidgetWindowBounds.Clone(),
            DockEdge = DockEdge,
            IsAutoHidden = IsAutoHidden,
            PeekThickness = PeekThickness
        };
    }
}

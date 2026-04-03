using System.Windows;

namespace TodoListss.App.Models;

public sealed class WindowPlacement
{
    public double Left { get; set; }

    public double Top { get; set; }

    public double Width { get; set; }

    public double Height { get; set; }

    public Rect ToRect() => new(Left, Top, Width, Height);

    public WindowPlacement Clone()
    {
        return new WindowPlacement
        {
            Left = Left,
            Top = Top,
            Width = Width,
            Height = Height
        };
    }

    public static WindowPlacement FromWindow(Window window)
    {
        return new WindowPlacement
        {
            Left = window.Left,
            Top = window.Top,
            Width = window.Width,
            Height = window.Height
        };
    }

    public static WindowPlacement CreateDefaultNormal()
    {
        return new WindowPlacement
        {
            Left = 120,
            Top = 80,
            Width = 480,
            Height = 680
        };
    }

    public static WindowPlacement CreateDefaultWidget()
    {
        return new WindowPlacement
        {
            Left = 40,
            Top = 40,
            Width = 280,
            Height = 360
        };
    }
}

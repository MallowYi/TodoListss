namespace TodoListss.App.Services;

public sealed class PersistenceException : Exception
{
    public PersistenceException(string message, Exception? innerException = null)
        : base(message, innerException)
    {
    }
}

using System;
using System.Threading.Tasks;

namespace ProjectFlow.Application.Interfaces;

public interface INotificationService
{
    Task SendNotificationAsync(Guid userId, string type, string title, string message, string? taskId = null, string? taskTitle = null, string? projectName = null);
}

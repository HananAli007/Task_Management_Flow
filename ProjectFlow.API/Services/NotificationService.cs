using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using ProjectFlow.API.Hubs;
using ProjectFlow.Application.Interfaces;

namespace ProjectFlow.API.Services;

public class NotificationService : INotificationService
{
    private readonly IHubContext<ChatHub> _hubContext;

    public NotificationService(IHubContext<ChatHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task SendNotificationAsync(
        Guid userId, 
        string type, 
        string title, 
        string message, 
        string? taskId = null, 
        string? taskTitle = null, 
        string? projectName = null)
    {
        // We push to the user's connection group, both standard casing and lowercase to avoid any mismatch.
        var userIdStr = userId.ToString();
        await _hubContext.Clients.Group(userIdStr).SendAsync("NotificationReceived", new
        {
            type,
            title,
            message,
            taskId,
            taskTitle,
            projectName,
            createdAt = DateTime.UtcNow
        });

        var lowerUserIdStr = userIdStr.ToLower();
        if (lowerUserIdStr != userIdStr)
        {
            await _hubContext.Clients.Group(lowerUserIdStr).SendAsync("NotificationReceived", new
            {
                type,
                title,
                message,
                taskId,
                taskTitle,
                projectName,
                createdAt = DateTime.UtcNow
            });
        }
    }
}

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using ProjectFlow.Application.Interfaces;

namespace ProjectFlow.API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IChatService _chatService;

    public ChatHub(IChatService chatService)
    {
        _chatService = chatService;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId != null)
        {
            // Each user joins their own group so we can target them directly
            await Groups.AddToGroupAsync(Context.ConnectionId, userId);
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId != null)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);
        }
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Called by client to send a message. Saves to DB then pushes to both sender & receiver.
    /// </summary>
    public async Task SendMessage(string receiverIdStr, string content, string? attachmentUrl = null, string messageType = "text")
    {
        var senderIdStr = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(senderIdStr)) return;

        var senderId = Guid.Parse(senderIdStr);
        var receiverId = Guid.Parse(receiverIdStr);

        // Persist to database
        var savedMessage = await _chatService.SaveMessageAsync(senderId, receiverId, content?.Trim() ?? "", attachmentUrl, messageType);

        // Push to receiver's group
        await Clients.Group(receiverIdStr).SendAsync("ReceiveMessage", savedMessage);

        // Push back to sender (for multi-tab support)
        await Clients.Group(senderIdStr).SendAsync("ReceiveMessage", savedMessage);
    }
}

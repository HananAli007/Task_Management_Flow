using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using ProjectFlow.Application.Interfaces;

namespace ProjectFlow.API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IChatService _chatService;
    private static readonly ConcurrentDictionary<string, int> OnlineUsers = new();

    public ChatHub(IChatService chatService)
    {
        _chatService = chatService;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId != null)
        {
            // Join personal group
            await Groups.AddToGroupAsync(Context.ConnectionId, userId);

            // Track online status atomically
            var newCount = OnlineUsers.AddOrUpdate(userId, 1, (key, count) => count + 1);
            
            // Broadcast status change ONLY on first connection
            if (newCount == 1)
            {
                await Clients.All.SendAsync("UserStatusChanged", userId, true);
            }

            // Sync current state to the caller
            await Clients.Caller.SendAsync("InitialOnlineUsers", OnlineUsers.Keys.ToList());
            var unreadCounts = await _chatService.GetUnreadCountsAsync(Guid.Parse(userId));
            await Clients.Caller.SendAsync("InitialUnreadCounts", unreadCounts);
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId != null)
        {
            bool wasRemoved = false;
            OnlineUsers.AddOrUpdate(userId, 0, (key, count) => {
                var next = count - 1;
                if (next <= 0) { wasRemoved = true; return 0; }
                return next;
            });

            if (wasRemoved)
            {
                OnlineUsers.TryRemove(userId, out _);
                await Clients.All.SendAsync("UserStatusChanged", userId, false);
            }
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);
        }
        await base.OnDisconnectedAsync(exception);
    }

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

    public async Task MarkAsRead(string senderIdStr)
    {
        var receiverIdStr = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(receiverIdStr) || string.IsNullOrEmpty(senderIdStr)) return;

        var senderId = Guid.Parse(senderIdStr);
        var receiverId = Guid.Parse(receiverIdStr);

        await _chatService.MarkAsReadAsync(senderId, receiverId);
        
        // Notify the reader's other sessions to clear the count
        await Clients.Group(receiverIdStr).SendAsync("MessagesRead", senderIdStr);
    }
}

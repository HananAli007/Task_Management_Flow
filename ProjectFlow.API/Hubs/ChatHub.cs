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

    public async Task SendTypingStatus(string receiverIdStr, bool isTyping, bool isRecording)
    {
        var senderIdStr = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(senderIdStr)) return;

        // Relay the typing/recording status to the receiver group
        await Clients.Group(receiverIdStr).SendAsync("UserTypingStatus", senderIdStr, isTyping, isRecording);
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

    public async Task InitiateCall(string receiverId, string sdpOffer, string callerName)
    {
        var senderId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(senderId)) return;

        // Relay incoming call with SDP offer and caller's name to the receiver group
        await Clients.Group(receiverId).SendAsync("IncomingCall", senderId, sdpOffer, callerName);
    }

    public async Task AcceptCall(string callerId, string sdpAnswer)
    {
        var receiverId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(receiverId)) return;

        // Relay call acceptance with SDP answer to the caller group
        await Clients.Group(callerId).SendAsync("CallAccepted", receiverId, sdpAnswer);
    }

    public async Task RejectCall(string callerId, string reason)
    {
        var receiverId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(receiverId)) return;

        // Relay call rejection to the caller group
        await Clients.Group(callerId).SendAsync("CallRejected", receiverId, reason);
    }

    public async Task HangUpCall(string peerId)
    {
        var senderId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(senderId)) return;

        // Relay call ended to the other peer group
        await Clients.Group(peerId).SendAsync("CallEnded", senderId);
    }

    public async Task SendIceCandidate(string peerId, string candidateJson)
    {
        var senderId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(senderId)) return;

        // Relay ICE candidate to the other peer group
        await Clients.Group(peerId).SendAsync("ReceiveIceCandidate", senderId, candidateJson);
    }
}

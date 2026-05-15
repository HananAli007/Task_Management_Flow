using Microsoft.EntityFrameworkCore;
using ProjectFlow.Application.DTOs.Chat;
using ProjectFlow.Application.Interfaces;
using ProjectFlow.Domain.Entities;
using ProjectFlow.Infrastructure.Data;

namespace ProjectFlow.Infrastructure.Services;

public class ChatService : IChatService
{
    private readonly AppDbContext _db;

    public ChatService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<ChatMessageDto>> GetConversationAsync(Guid userId1, Guid userId2)
    {
        var messages = await _db.ChatMessages
            .Include(m => m.Sender)
            .Where(m =>
                (m.SenderId == userId1 && m.ReceiverId == userId2) ||
                (m.SenderId == userId2 && m.ReceiverId == userId1))
            .OrderBy(m => m.SentAt)
            .Select(m => new ChatMessageDto
            {
                Id = m.Id,
                SenderId = m.SenderId,
                SenderName = m.Sender.Name,
                ReceiverId = m.ReceiverId,
                Content = m.Content,
                AttachmentUrl = m.AttachmentUrl,
                MessageType = m.MessageType,
                SentAt = m.SentAt,
                IsRead = m.IsRead
            })
            .ToListAsync();

        return messages;
    }

    public async Task<ChatMessageDto> SaveMessageAsync(Guid senderId, Guid receiverId, string content, string? attachmentUrl = null, string messageType = "text")
    {
        var message = new ChatMessage
        {
            Id = Guid.NewGuid(),
            SenderId = senderId,
            ReceiverId = receiverId,
            Content = content,
            AttachmentUrl = attachmentUrl,
            MessageType = messageType,
            SentAt = DateTime.UtcNow,
            IsRead = false
        };

        _db.ChatMessages.Add(message);
        await _db.SaveChangesAsync();

        var sender = await _db.Users.FindAsync(senderId);

        return new ChatMessageDto
        {
            Id = message.Id,
            SenderId = message.SenderId,
            SenderName = sender?.Name ?? "Unknown",
            ReceiverId = message.ReceiverId,
            Content = message.Content,
            AttachmentUrl = message.AttachmentUrl,
            MessageType = message.MessageType,
            SentAt = message.SentAt,
            IsRead = message.IsRead
        };
    }

    public async Task MarkAsReadAsync(Guid senderId, Guid receiverId)
    {
        var unread = await _db.ChatMessages
            .Where(m => m.SenderId == senderId && m.ReceiverId == receiverId && !m.IsRead)
            .ToListAsync();

        foreach (var msg in unread)
            msg.IsRead = true;

        await _db.SaveChangesAsync();
    }

    public async Task<Dictionary<Guid, int>> GetUnreadCountsAsync(Guid userId)
    {
        return await _db.ChatMessages
            .Where(m => m.ReceiverId == userId && !m.IsRead)
            .GroupBy(m => m.SenderId)
            .Select(g => new { SenderId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.SenderId, x => x.Count);
    }
}

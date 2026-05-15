using ProjectFlow.Application.DTOs.Chat;

namespace ProjectFlow.Application.Interfaces;

public interface IChatService
{
    Task<List<ChatMessageDto>> GetConversationAsync(Guid userId1, Guid userId2);
    Task<ChatMessageDto> SaveMessageAsync(Guid senderId, Guid receiverId, string content, string? attachmentUrl = null, string messageType = "text");
    Task MarkAsReadAsync(Guid senderId, Guid receiverId);
    Task<Dictionary<Guid, int>> GetUnreadCountsAsync(Guid userId);
}

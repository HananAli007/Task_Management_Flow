namespace ProjectFlow.Domain.Entities;

public class ChatMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SenderId { get; set; }
    public Guid ReceiverId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? AttachmentUrl { get; set; }
    public string MessageType { get; set; } = "text"; // "text", "image", "file", "voice"
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public bool IsRead { get; set; } = false;

    // Navigation
    public AppUser Sender { get; set; } = null!;
    public AppUser Receiver { get; set; } = null!;
}

using ProjectFlow.Domain.Enums;

namespace ProjectFlow.Domain.Entities;

public class Attachment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public AttachmentSourceType SourceType { get; set; }
    public Guid SourceId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty; 
    public long FileSize { get; set; }
    public Guid UploaderId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public AppUser Uploader { get; set; } = null!;
    
    public Guid? TaskItemId { get; set; }
    public TaskItem? TaskItem { get; set; }
    
    public Guid? SubtaskId { get; set; }
    public Subtask? Subtask { get; set; }
    
    public Guid? CommentId { get; set; }
    public Comment? Comment { get; set; }
}

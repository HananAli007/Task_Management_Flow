using ProjectFlow.Domain.Enums;

namespace ProjectFlow.Domain.Entities;

public class TaskItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "0";
    public TaskItemPriority Priority { get; set; } = TaskItemPriority.Medium;
    public Guid? AssigneeId { get; set; }
    public Guid CreatorId { get; set; }
    public DateTime? Deadline { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; }

    // Navigation Properties
    public Project Project { get; set; } = null!;
    public AppUser? Assignee { get; set; }
    public AppUser Creator { get; set; } = null!;
    public ICollection<Subtask> Subtasks { get; set; } = new List<Subtask>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
    public ICollection<TaskTag> TaskTags { get; set; } = new List<TaskTag>();
}

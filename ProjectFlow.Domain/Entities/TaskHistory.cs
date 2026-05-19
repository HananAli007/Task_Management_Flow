using System;

namespace ProjectFlow.Domain.Entities;

public class TaskHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TaskId { get; set; }
    public Guid UserId { get; set; }
    public string Action { get; set; } = string.Empty; // "Create", "Assign", "Move", "SubtaskCreate", "SubtaskAssign", "Edit"
    public string Details { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public TaskItem Task { get; set; } = null!;
    public AppUser User { get; set; } = null!;
}

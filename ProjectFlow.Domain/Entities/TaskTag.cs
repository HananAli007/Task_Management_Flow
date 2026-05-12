namespace ProjectFlow.Domain.Entities;

public class TaskTag
{
    public Guid TaskId { get; set; }
    public Guid TagId { get; set; }

    // Navigation Properties
    public TaskItem? Task { get; set; }
    public Tag Tag { get; set; } = null!;
}

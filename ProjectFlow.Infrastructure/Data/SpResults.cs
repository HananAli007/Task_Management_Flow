namespace ProjectFlow.Infrastructure.Data;

public class ProjectSpResult
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? Deadline { get; set; }
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public double Progress { get; set; }
    public string? MemberIdsString { get; set; }
    public string? MemberNamesString { get; set; }
    public string? MemberAvatarsString { get; set; }
}



public class TaskSpResult
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public string StatusName { get; set; } = string.Empty;
    public int? SystemStatus { get; set; }
    public string Priority { get; set; } = string.Empty;
    public Guid? AssigneeId { get; set; }
    public string? AssigneeName { get; set; }
    public string? AssigneeAvatar { get; set; }
    public Guid CreatorId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? Deadline { get; set; }
    public int SubtaskCount { get; set; }
    public int CompletedSubtaskCount { get; set; }
    public int CommentCount { get; set; }
    public int AttachmentCount { get; set; }
    public string? TagNamesString { get; set; }
}

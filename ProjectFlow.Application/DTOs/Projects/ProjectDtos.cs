using System.ComponentModel.DataAnnotations;

namespace ProjectFlow.Application.DTOs.Projects;

public class CreateProjectDto
{
    [Required(ErrorMessage = "Project name is required.")]
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "active";
    public string Priority { get; set; } = "medium";
    public DateTime? Deadline { get; set; }
    public List<Guid>? MemberIds { get; set; }
}

public class UpdateProjectDto
{
    [Required(ErrorMessage = "Project name is required.")]
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "active";
    public string Priority { get; set; } = "medium";
    public DateTime? Deadline { get; set; }
    public List<Guid>? MemberIds { get; set; }
}

public class ProjectResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public double Progress { get; set; }
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public List<Guid> MemberIds { get; set; } = new();
    public string? MemberNamesString { get; set; }
    public string? MemberAvatarsString { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? Deadline { get; set; }
}

public class AddMemberDto
{
    [Required]
    public Guid ProjectId { get; set; }

    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = "member";
}

public class ProjectStatsDto
{
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int InProgressTasks { get; set; }
    public int TodoTasks { get; set; }
    public double CompletionRate { get; set; }
    public List<TaskPriorityStat> PriorityDistribution { get; set; } = new();
}

public class TaskPriorityStat
{
    public string Priority { get; set; } = string.Empty;
    public int Count { get; set; }
}

namespace ProjectFlow.Domain.Entities;

public class ProjectMember
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public Guid UserId { get; set; }
    public string Role { get; set; } = "member";
    public int? GroupId { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public AppGroup? Group { get; set; }

    // Navigation Properties
    public Project? Project { get; set; }
    public AppUser User { get; set; } = null!;
}

using Microsoft.AspNetCore.Identity;

namespace ProjectFlow.Domain.Entities;

public class AppUser : IdentityUser<Guid>
{
    public string Name { get; set; } = string.Empty;
    public bool IsDeleted { get; set; } = false;
    public string Role { get; set; } = "member";
    public string? Phone { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
    public string? AvatarUrl { get; set; }
    public int? GroupId { get; set; }

    // Navigation
    public AppGroup? Group { get; set; }

    // Navigation Properties
    public ICollection<ProjectMember> ProjectMemberships { get; set; } = new List<ProjectMember>();
    public ICollection<TaskItem> AssignedTasks { get; set; } = new List<TaskItem>();
    public ICollection<TaskItem> CreatedTasks { get; set; } = new List<TaskItem>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
}

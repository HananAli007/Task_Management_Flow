namespace ProjectFlow.Domain.Entities;

public class AppGroup
{
    public int Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "A"; // A = Active, I = Inactive
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    // Navigation
    public ICollection<AppUser> Users { get; set; } = new List<AppUser>();
    public ICollection<AppScreenPermission> Permissions { get; set; } = new List<AppScreenPermission>();
}

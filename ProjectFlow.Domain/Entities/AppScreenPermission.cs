namespace ProjectFlow.Domain.Entities;

public class AppScreenPermission
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public int AppScreenId { get; set; }
    public int? AppScreenObjectId { get; set; }
    public bool AllowPermission { get; set; }

    // Navigation
    public AppGroup Group { get; set; } = null!;
    public AppScreen Screen { get; set; } = null!;
    public AppScreenObject? Object { get; set; }
}

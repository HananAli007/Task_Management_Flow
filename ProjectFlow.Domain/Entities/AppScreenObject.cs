namespace ProjectFlow.Domain.Entities;

public class AppScreenObject
{
    public int Id { get; set; }
    public int AppScreenId { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "A";

    // Navigation
    public AppScreen Screen { get; set; } = null!;
}

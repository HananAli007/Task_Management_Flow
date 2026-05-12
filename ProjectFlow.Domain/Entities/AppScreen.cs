namespace ProjectFlow.Domain.Entities;

public class AppScreen
{
    public int Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "A";

    // Navigation
    public ICollection<AppScreenObject> Objects { get; set; } = new List<AppScreenObject>();
}

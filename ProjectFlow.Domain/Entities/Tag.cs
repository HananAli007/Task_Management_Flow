namespace ProjectFlow.Domain.Entities;

public class Tag
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;

    // Navigation Properties
    public ICollection<TaskTag> TaskTags { get; set; } = new List<TaskTag>();
}

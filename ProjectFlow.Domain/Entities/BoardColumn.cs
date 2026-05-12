using System.ComponentModel.DataAnnotations;

namespace ProjectFlow.Domain.Entities;

public class BoardColumn
{
    public int Id { get; set; }
    public Guid ProjectId { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Title { get; set; } = string.Empty;
    
    public int OrderIndex { get; set; }
    public string? Color { get; set; }
    public int? SystemStatus { get; set; }
    public bool IsDeleted { get; set; }

    // Navigation Properties
    public Project Project { get; set; } = null!;
}

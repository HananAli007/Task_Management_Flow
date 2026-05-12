using System.ComponentModel.DataAnnotations;

namespace ProjectFlow.Application.DTOs.Tags;

public class TagResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class CreateTagDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}

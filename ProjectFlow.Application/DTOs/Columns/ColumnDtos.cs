using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ProjectFlow.Application.DTOs.Columns;

public class ColumnResponseDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    
    [JsonPropertyName("project_id")]
    public Guid ProjectId { get; set; }
    
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;
    
    [JsonPropertyName("order_index")]
    public int OrderIndex { get; set; }
    
    [JsonPropertyName("color")]
    public string? Color { get; set; }

    [JsonPropertyName("system_status")]
    public int? SystemStatus { get; set; }
}

public class CreateColumnDto
{
    [Required]
    [JsonPropertyName("project_id")]
    public Guid ProjectId { get; set; }
    
    [Required]
    [MaxLength(100)]
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;
    
    [JsonPropertyName("order_index")]
    public int OrderIndex { get; set; }
    
    [JsonPropertyName("color")]
    public string? Color { get; set; }
}

public class UpdateColumnDto
{
    [Required]
    [MaxLength(100)]
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;
    
    [JsonPropertyName("order_index")]
    public int OrderIndex { get; set; }
    
    [JsonPropertyName("color")]
    public string? Color { get; set; }
}

using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace ProjectFlow.Application.DTOs.Subtasks;

public class CreateSubtaskFormDto
{
    [Required(ErrorMessage = "Title is required.")]
    public string Title { get; set; } = string.Empty;
    public bool IsCompleted { get; set; } = false;
    public Guid? AssigneeId { get; set; }
    public IFormFileCollection? Attachments { get; set; }
}

public class UpdateSubtaskFormDto
{
    [Required(ErrorMessage = "Title is required.")]
    public string Title { get; set; } = string.Empty;
    public bool IsCompleted { get; set; } = false;
    public Guid? AssigneeId { get; set; }
    public IFormFileCollection? NewAttachments { get; set; }
}

public class SubtaskResponseDto
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public Guid? AssigneeId { get; set; }
    public string? AssigneeName { get; set; }
    public Guid CreatorId { get; set; }
    public string? CreatorName { get; set; }
    public DateTime CreatedAt { get; set; }
    public int AttachmentCount { get; set; }
    public List<AttachmentDto> Attachments { get; set; } = new();
}

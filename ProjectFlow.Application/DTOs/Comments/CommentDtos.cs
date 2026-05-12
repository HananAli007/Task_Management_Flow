using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace ProjectFlow.Application.DTOs.Comments;

public class CreateCommentDto
{
    [Required(ErrorMessage = "Content is required.")]
    public string Content { get; set; } = string.Empty;
    public IFormFileCollection? Attachments { get; set; }
}

public class CommentResponseDto
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public List<AttachmentDto> Attachments { get; set; } = new();
}

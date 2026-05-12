using ProjectFlow.Application.DTOs.Comments;

namespace ProjectFlow.Application.Interfaces;

public interface ICommentService
{
    Task<CommentResponseDto> CreateAsync(Guid taskId, CreateCommentDto input, Guid userId);
    Task<List<CommentResponseDto>> GetByTaskAsync(Guid taskId);
}

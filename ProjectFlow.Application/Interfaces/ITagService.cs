using ProjectFlow.Application.DTOs.Tags;

namespace ProjectFlow.Application.Interfaces;

public interface ITagService
{
    Task<List<TagResponseDto>> GetAllAsync();
    Task<TagResponseDto> CreateAsync(CreateTagDto input);
    Task<List<TagResponseDto>> GetByTaskAsync(Guid taskId);
    Task<bool> AssignToTaskAsync(Guid taskId, List<string> tagNames);
}

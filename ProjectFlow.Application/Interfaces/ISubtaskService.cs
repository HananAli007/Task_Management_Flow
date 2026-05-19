using ProjectFlow.Application.DTOs.Subtasks;

namespace ProjectFlow.Application.Interfaces;

public interface ISubtaskService
{
    Task<SubtaskResponseDto> CreateAsync(Guid taskId, CreateSubtaskFormDto input, Guid creatorId);
    Task<List<SubtaskResponseDto>> GetByTaskAsync(Guid taskId);
    Task<SubtaskResponseDto?> UpdateAsync(Guid id, UpdateSubtaskFormDto input, Guid userId);
    Task<bool> DeleteAsync(Guid id);
}

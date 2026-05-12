using ProjectFlow.Application.DTOs.Tasks;

namespace ProjectFlow.Application.Interfaces;

public interface ITaskService
{
    Task<TaskResponseDto> CreateAsync(CreateTaskFormDto input, Guid creatorId);
    Task<List<TaskResponseDto>> GetByProjectAsync(Guid projectId);
    Task<TaskDetailResponseDto?> GetByIdAsync(Guid id);
    Task<List<TaskResponseDto>> GetMyTasksAsync(Guid userId);
    Task<TaskResponseDto?> UpdateAsync(Guid id, UpdateTaskFormDto input);
    Task<bool> UpdateStatusAsync(Guid id, string status);
    Task<bool> DeleteAsync(Guid id);
}

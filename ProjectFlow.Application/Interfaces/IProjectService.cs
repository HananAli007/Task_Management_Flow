using ProjectFlow.Application.DTOs.Projects;

namespace ProjectFlow.Application.Interfaces;

public interface IProjectService
{
    Task<ProjectResponseDto> CreateAsync(CreateProjectDto input, Guid creatorId);
    Task<List<ProjectResponseDto>> GetAllAsync(Guid userId);
    Task<ProjectResponseDto?> GetByIdAsync(Guid id);
    Task<ProjectResponseDto?> UpdateAsync(Guid id, UpdateProjectDto input);
    Task<bool> DeleteAsync(Guid id);
    Task<bool> AddMemberAsync(Guid projectId, AddMemberDto input);
    Task<ProjectStatsDto?> GetStatsAsync(Guid id);
}

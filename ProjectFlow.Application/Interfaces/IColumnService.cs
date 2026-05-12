using ProjectFlow.Application.DTOs.Columns;

namespace ProjectFlow.Application.Interfaces;

public interface IColumnService
{
    Task<List<ColumnResponseDto>> GetByProjectAsync(Guid projectId);
    Task<ColumnResponseDto> CreateAsync(CreateColumnDto input);
    Task<ColumnResponseDto?> UpdateAsync(int id, UpdateColumnDto input);
    Task<bool> DeleteAsync(int id);
    Task<bool> InitializeDefaultColumnsAsync(Guid projectId);
}

using Microsoft.EntityFrameworkCore;
using ProjectFlow.Application.DTOs.Columns;
using ProjectFlow.Application.Interfaces;
using ProjectFlow.Domain.Entities;
using ProjectFlow.Infrastructure.Data;

namespace ProjectFlow.Infrastructure.Services;

public class ColumnService : IColumnService
{
    private readonly AppDbContext _context;

    public ColumnService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ColumnResponseDto>> GetByProjectAsync(Guid projectId)
    {
        var columns = await _context.BoardColumns
            .Where(c => c.ProjectId == projectId)
            .OrderBy(c => c.OrderIndex)
            .ToListAsync();

        if (columns.Count == 0)
        {
            // Auto-initialize default columns if none exist
            await InitializeDefaultColumnsAsync(projectId);
            columns = await _context.BoardColumns
                .Where(c => c.ProjectId == projectId)
                .OrderBy(c => c.OrderIndex)
                .ToListAsync();
        }

        return columns.Select(c => MapToResponse(c)).ToList();
    }

    public async Task<ColumnResponseDto> CreateAsync(CreateColumnDto input)
    {
        var column = new BoardColumn
        {
            ProjectId = input.ProjectId,
            Title = input.Title,
            OrderIndex = input.OrderIndex,
            Color = input.Color
        };

        _context.BoardColumns.Add(column);
        await _context.SaveChangesAsync();
        return MapToResponse(column);
    }

    public async Task<ColumnResponseDto?> UpdateAsync(int id, UpdateColumnDto input)
    {
        var column = await _context.BoardColumns.FindAsync(id);
        if (column == null) return null;

        column.Title = input.Title;
        column.OrderIndex = input.OrderIndex;
        column.Color = input.Color;

        await _context.SaveChangesAsync();
        return MapToResponse(column);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var column = await _context.BoardColumns.FindAsync(id);
        if (column == null) return false;

        column.IsDeleted = true;
        
        // Soft delete all tasks in this stage
        var stageId = id.ToString();
        var tasks = await _context.TaskItems
            .Where(t => t.Status == stageId)
            .ToListAsync();
            
        foreach (var task in tasks)
        {
            task.IsDeleted = true;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> InitializeDefaultColumnsAsync(Guid projectId)
    {
        var existing = await _context.BoardColumns.AnyAsync(c => c.ProjectId == projectId);
        if (existing) return true;

        var defaults = new List<BoardColumn>
        {
            new BoardColumn { ProjectId = projectId, Title = "To Do", OrderIndex = 0, SystemStatus = 0 },
            new BoardColumn { ProjectId = projectId, Title = "In Progress", OrderIndex = 1, SystemStatus = 1 },
            new BoardColumn { ProjectId = projectId, Title = "Review", OrderIndex = 2, SystemStatus = 2 },
            new BoardColumn { ProjectId = projectId, Title = "Done", OrderIndex = 3, SystemStatus = 3 }
        };

        _context.BoardColumns.AddRange(defaults);
        await _context.SaveChangesAsync();
        return true;
    }

    private static ColumnResponseDto MapToResponse(BoardColumn column) => new()
    {
        Id = column.Id,
        ProjectId = column.ProjectId,
        Title = column.Title,
        OrderIndex = column.OrderIndex,
        Color = column.Color,
        SystemStatus = column.SystemStatus
    };
}

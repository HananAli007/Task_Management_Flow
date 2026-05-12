using Microsoft.EntityFrameworkCore;
using ProjectFlow.Application.DTOs.Subtasks;
using ProjectFlow.Application.Interfaces;
using ProjectFlow.Domain.Entities;
using ProjectFlow.Domain.Enums;
using ProjectFlow.Application.DTOs;
using ProjectFlow.Infrastructure.Data;

namespace ProjectFlow.Infrastructure.Services;

public class SubtaskService : ISubtaskService
{
    private readonly AppDbContext _context;
    private readonly IAttachmentService _attachmentService;

    public SubtaskService(AppDbContext context, IAttachmentService attachmentService)
    {
        _context = context;
        _attachmentService = attachmentService;
    }

    public async Task<SubtaskResponseDto> CreateAsync(Guid taskId, CreateSubtaskFormDto input, Guid creatorId)
    {
        var taskExists = await _context.TaskItems.AnyAsync(t => t.Id == taskId);
        if (!taskExists)
        {
            throw new KeyNotFoundException("Task not found. Please provide a valid Task ID.");
        }

        var subtask = new Subtask
        {
            Id = Guid.NewGuid(),
            TaskId = taskId,
            Title = input.Title,
            IsCompleted = input.IsCompleted,
            AssigneeId = input.AssigneeId,
            CreatorId = creatorId,
            CreatedAt = DateTime.UtcNow
        };
        _context.Subtasks.Add(subtask);
        await _context.SaveChangesAsync();

        if (input.Attachments != null && input.Attachments.Count > 0)
        {
            await _attachmentService.UploadMultipleAsync(input.Attachments, AttachmentSourceType.Subtask, subtask.Id, creatorId);
        }
        
        var creator = await _context.Users.FindAsync(creatorId);
        var assignee = input.AssigneeId.HasValue ? await _context.Users.FindAsync(input.AssigneeId.Value) : null;
        
        // Fetch again to get attachments
        var result = await _context.Subtasks
            .Include(s => s.Attachments)
            .FirstOrDefaultAsync(s => s.Id == subtask.Id);

        return new SubtaskResponseDto 
        { 
            Id = subtask.Id, 
            TaskId = subtask.TaskId, 
            Title = subtask.Title, 
            IsCompleted = subtask.IsCompleted, 
            AssigneeId = subtask.AssigneeId,
            AssigneeName = assignee?.Name,
            CreatorId = subtask.CreatorId,
            CreatorName = creator?.Name,
            CreatedAt = subtask.CreatedAt, 
            AttachmentCount = result?.Attachments.Count ?? 0,
            Attachments = result?.Attachments.Select(a => new AttachmentDto
            {
                Id = a.Id,
                Name = a.FileName,
                Url = a.Url,
                Type = a.FileType,
                FileSize = AttachmentDto.FormatFileSize(a.FileSize)
            }).ToList() ?? new()
        };
    }

    public async Task<List<SubtaskResponseDto>> GetByTaskAsync(Guid taskId)
    {
        return await _context.Subtasks
            .Include(s => s.Attachments)
            .Include(s => s.Assignee)
            .Include(s => s.Creator)
            .Where(s => s.TaskId == taskId)
            .OrderBy(s => s.CreatedAt)
            .Select(s => new SubtaskResponseDto 
            { 
                Id = s.Id, 
                TaskId = s.TaskId, 
                Title = s.Title, 
                IsCompleted = s.IsCompleted, 
                AssigneeId = s.AssigneeId,
                AssigneeName = s.Assignee != null ? s.Assignee.Name : null,
                CreatorId = s.CreatorId,
                CreatorName = s.Creator != null ? s.Creator.Name : "Unknown",
                CreatedAt = s.CreatedAt, 
                AttachmentCount = s.Attachments.Count,
                Attachments = s.Attachments.Select(a => new AttachmentDto
                {
                    Id = a.Id,
                    Name = a.FileName,
                    Url = a.Url,
                    Type = a.FileType,
                    FileSize = AttachmentDto.FormatFileSize(a.FileSize)
                }).ToList()
            }).ToListAsync();
    }

    public async Task<SubtaskResponseDto?> UpdateAsync(Guid id, UpdateSubtaskFormDto input)
    {
        var subtask = await _context.Subtasks
            .Include(s => s.Attachments)
            .Include(s => s.Assignee)
            .Include(s => s.Creator)
            .FirstOrDefaultAsync(s => s.Id == id);
            
        if (subtask == null) return null;
        
        subtask.Title = input.Title;
        subtask.IsCompleted = input.IsCompleted;
        subtask.AssigneeId = input.AssigneeId;
        
        if (input.NewAttachments != null && input.NewAttachments.Count > 0)
        {
            await _attachmentService.UploadMultipleAsync(input.NewAttachments, AttachmentSourceType.Subtask, subtask.Id, subtask.CreatorId);
        }
        await _context.SaveChangesAsync();
        
        // Refresh to get navigation properties if they changed
        var updatedSubtask = await _context.Subtasks
            .Include(s => s.Assignee)
            .Include(s => s.Creator)
            .FirstOrDefaultAsync(s => s.Id == id);

        return new SubtaskResponseDto 
        { 
            Id = subtask.Id, 
            TaskId = subtask.TaskId, 
            Title = subtask.Title, 
            IsCompleted = subtask.IsCompleted, 
            AssigneeId = subtask.AssigneeId,
            AssigneeName = updatedSubtask?.Assignee?.Name,
            CreatorId = subtask.CreatorId,
            CreatorName = updatedSubtask?.Creator?.Name,
            CreatedAt = subtask.CreatedAt, 
            AttachmentCount = subtask.Attachments.Count,
            Attachments = subtask.Attachments.Select(a => new AttachmentDto
            {
                Id = a.Id,
                Name = a.FileName,
                Url = a.Url,
                Type = a.FileType,
                FileSize = AttachmentDto.FormatFileSize(a.FileSize)
            }).ToList()
        };
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var subtask = await _context.Subtasks.FindAsync(id);
        if (subtask == null) return false;
        _context.Subtasks.Remove(subtask);
        await _context.SaveChangesAsync();
        return true;
    }
}

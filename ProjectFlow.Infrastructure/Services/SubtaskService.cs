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
    private readonly INotificationService _notificationService;

    public SubtaskService(AppDbContext context, IAttachmentService attachmentService, INotificationService notificationService)
    {
        _context = context;
        _attachmentService = attachmentService;
        _notificationService = notificationService;
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

        // Log Subtask Creation History
        await LogHistoryAsync(taskId, creatorId, "SubtaskCreate", $"Created subtask '{subtask.Title}'");
        
        if (subtask.AssigneeId.HasValue && subtask.AssigneeId.Value != Guid.Empty)
        {
            var assigneeUser = await _context.Users.FindAsync(subtask.AssigneeId.Value);
            var assigneeName = assigneeUser?.Name ?? "Unknown";
            await LogHistoryAsync(taskId, creatorId, "SubtaskAssign", $"Assigned subtask '{subtask.Title}' to {assigneeName}");

            try
            {
                var taskItem = await _context.TaskItems.FindAsync(taskId);
                var creatorUser = await _context.Users.FindAsync(creatorId);
                var creatorName = creatorUser?.Name ?? "A team member";

                await _notificationService.SendNotificationAsync(
                    subtask.AssigneeId.Value,
                    "SubtaskAssignment",
                    "New Subtask Assigned",
                    $"Subtask '{subtask.Title}' of task '{taskItem?.Title ?? "General"}' has been assigned to you by {creatorName}.",
                    taskId.ToString(),
                    taskItem?.Title,
                    ""
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[NOTIFICATION ERROR] Failed to send subtask assignment notification: {ex.Message}");
            }
        }

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

    public async Task<SubtaskResponseDto?> UpdateAsync(Guid id, UpdateSubtaskFormDto input, Guid userId)
    {
        var subtask = await _context.Subtasks
            .Include(s => s.Attachments)
            .Include(s => s.Assignee)
            .Include(s => s.Creator)
            .FirstOrDefaultAsync(s => s.Id == id);
            
        if (subtask == null) return null;

        var oldAssigneeId = subtask.AssigneeId;
        var oldIsCompleted = subtask.IsCompleted;
        
        subtask.Title = input.Title;
        subtask.IsCompleted = input.IsCompleted;
        subtask.AssigneeId = input.AssigneeId;
        
        if (input.NewAttachments != null && input.NewAttachments.Count > 0)
        {
            await _attachmentService.UploadMultipleAsync(input.NewAttachments, AttachmentSourceType.Subtask, subtask.Id, subtask.CreatorId);
        }
        await _context.SaveChangesAsync();

        // Log Subtask Edit/Assign/Completion History
        if (oldIsCompleted != input.IsCompleted)
        {
            var statusStr = input.IsCompleted ? "completed" : "incomplete";
            await LogHistoryAsync(subtask.TaskId, userId, "SubtaskEdit", $"Marked subtask '{subtask.Title}' as {statusStr}");
        }
        
        if (oldAssigneeId != input.AssigneeId)
        {
            if (input.AssigneeId.HasValue && input.AssigneeId.Value != Guid.Empty)
            {
                var assigneeUser = await _context.Users.FindAsync(input.AssigneeId.Value);
                var assigneeName = assigneeUser?.Name ?? "Unknown";
                await LogHistoryAsync(subtask.TaskId, userId, "SubtaskAssign", $"Assigned subtask '{subtask.Title}' to {assigneeName}");

                try
                {
                    var taskItem = await _context.TaskItems.FindAsync(subtask.TaskId);
                    var updaterUser = await _context.Users.FindAsync(userId);
                    var updaterName = updaterUser?.Name ?? "A team member";

                    await _notificationService.SendNotificationAsync(
                        input.AssigneeId.Value,
                        "SubtaskAssignment",
                        "Subtask Assigned to You",
                        $"Subtask '{subtask.Title}' of task '{taskItem?.Title ?? "General"}' has been assigned to you by {updaterName}.",
                        subtask.TaskId.ToString(),
                        taskItem?.Title,
                        ""
                    );
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[NOTIFICATION ERROR] Failed to send subtask reassignment notification: {ex.Message}");
                }
            }
            else
            {
                await LogHistoryAsync(subtask.TaskId, userId, "SubtaskAssign", $"Unassigned subtask '{subtask.Title}'");
            }
        }
        
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
        subtask.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task LogHistoryAsync(Guid taskId, Guid userId, string action, string details)
    {
        var log = new TaskHistory
        {
            Id = Guid.NewGuid(),
            TaskId = taskId,
            UserId = userId,
            Action = action,
            Details = details,
            CreatedAt = DateTime.UtcNow
        };
        _context.TaskHistories.Add(log);
        await _context.SaveChangesAsync();
    }
}

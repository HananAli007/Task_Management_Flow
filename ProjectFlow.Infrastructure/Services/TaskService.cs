using Microsoft.EntityFrameworkCore;
using ProjectFlow.Application.DTOs.Tasks;
using ProjectFlow.Application.Interfaces;
using ProjectFlow.Domain.Entities;
using ProjectFlow.Domain.Enums;
using ProjectFlow.Application.DTOs;
using ProjectFlow.Infrastructure.Data;

namespace ProjectFlow.Infrastructure.Services;

public class TaskService : ITaskService
{
    private readonly AppDbContext _context;
    private readonly IAttachmentService _attachmentService;

    public TaskService(AppDbContext context, IAttachmentService attachmentService)
    {
        _context = context;
        _attachmentService = attachmentService;
    }

    public async Task<TaskResponseDto> CreateAsync(CreateTaskFormDto input, Guid creatorId)
    {
        // Check if project exists
        var projectExists = await _context.Projects.AnyAsync(p => p.Id == input.ProjectId);
        if (!projectExists)
        {
            throw new KeyNotFoundException("Project not found. Please provide a valid Project ID.");
        }

        // Check if assignee exists (if provided)
        if (input.AssigneeId.HasValue && input.AssigneeId.Value != Guid.Empty)
        {
            var assigneeExists = await _context.Users.AnyAsync(u => u.Id == input.AssigneeId.Value);
            if (!assigneeExists)
            {
                throw new KeyNotFoundException("Assignee user not found. Please provide a valid User ID or leave it empty.");
            }
        }

        var task = new TaskItem
        {
            Id = Guid.NewGuid(),
            ProjectId = input.ProjectId,
            Title = input.Title,
            Description = input.Description,
            Status = input.Status ?? "0",
            Priority = ParseTaskPriority(input.Priority),
            AssigneeId = input.AssigneeId,
            CreatorId = creatorId,
            Deadline = input.Deadline,
            CreatedAt = DateTime.UtcNow
        };

        _context.TaskItems.Add(task);

        // Handle tags
        if (input.TagNames != null && input.TagNames.Any())
        {
            foreach (var name in input.TagNames)
            {
                var tagName = name.Trim();
                if (string.IsNullOrEmpty(tagName)) continue;

                var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Name.ToLower() == tagName.ToLower());
                if (tag == null)
                {
                    tag = new Tag { Id = Guid.NewGuid(), Name = tagName };
                    _context.Tags.Add(tag);
                    await _context.SaveChangesAsync();
                }
                _context.TaskTags.Add(new TaskTag { TaskId = task.Id, TagId = tag.Id });
            }
        }

        await _context.SaveChangesAsync();

        // Handle attachments
        if (input.Attachments != null && input.Attachments.Count > 0)
        {
            await _attachmentService.UploadMultipleAsync(input.Attachments, AttachmentSourceType.Task, task.Id, creatorId);
        }

        return await MapToResponseDto(task);
    }

    public async Task<List<TaskResponseDto>> GetByProjectAsync(Guid projectId)
    {
        // Using Refined Stored Procedure
        var results = await _context.Database
            .SqlQueryRaw<TaskSpResult>("EXEC sp_GetProjectTasks @ProjectId = {0}", projectId)
            .ToListAsync();

        return results.Select(r => new TaskResponseDto
        {
            Id = r.Id,
            ProjectId = r.ProjectId,
            ProjectName = r.ProjectName,
            Title = r.Title,
            Description = r.Description,
            Status = r.Status.ToString(),
            StatusName = r.StatusName,
            SystemStatus = r.SystemStatus,
            Priority = Enum.TryParse<TaskItemPriority>(r.Priority, true, out var priority) ? FormatPriority(priority) : "medium",
            AssigneeId = r.AssigneeId,
            AssigneeName = r.AssigneeName,
            AssigneeAvatar = r.AssigneeAvatar,
            CreatorId = r.CreatorId,
            CreatedAt = r.CreatedAt,
            Deadline = r.Deadline,
            SubtaskCount = r.SubtaskCount,
            CompletedSubtaskCount = r.CompletedSubtaskCount,
            CommentCount = r.CommentCount,
            AttachmentCount = r.AttachmentCount,
            Tags = string.IsNullOrEmpty(r.TagNamesString)
                ? new List<ProjectFlow.Application.DTOs.Tags.TagResponseDto>()
                : r.TagNamesString.Split(',')
                    .Select(name => new ProjectFlow.Application.DTOs.Tags.TagResponseDto { Name = name.Trim() })
                    .ToList()
        }).ToList();
    }

    public async Task<List<TaskResponseDto>> GetMyTasksAsync(Guid userId)
    {
        // Using Refined Stored Procedure to solve N+1 issue
        var results = await _context.Database
            .SqlQueryRaw<TaskSpResult>("EXEC sp_GetMyTasks @UserId = {0}", userId)
            .ToListAsync();

        return results.Select(r => new TaskResponseDto
        {
            Id = r.Id,
            ProjectId = r.ProjectId,
            ProjectName = r.ProjectName,
            Title = r.Title,
            Description = r.Description,
            Status = r.Status.ToString(),
            StatusName = r.StatusName,
            SystemStatus = r.SystemStatus,
            Priority = Enum.TryParse<TaskItemPriority>(r.Priority, true, out var priority) ? FormatPriority(priority) : "medium",
            AssigneeId = r.AssigneeId,
            AssigneeName = r.AssigneeName,
            AssigneeAvatar = r.AssigneeAvatar,
            CreatorId = r.CreatorId,
            CreatedAt = r.CreatedAt,
            Deadline = r.Deadline,
            SubtaskCount = r.SubtaskCount,
            CompletedSubtaskCount = r.CompletedSubtaskCount,
            CommentCount = r.CommentCount,
            AttachmentCount = r.AttachmentCount,
            Tags = string.IsNullOrEmpty(r.TagNamesString)
                ? new List<ProjectFlow.Application.DTOs.Tags.TagResponseDto>()
                : r.TagNamesString.Split(',')
                    .Select(name => new ProjectFlow.Application.DTOs.Tags.TagResponseDto { Name = name.Trim() })
                    .ToList()
        }).ToList();
    }


    public async Task<TaskDetailResponseDto?> GetByIdAsync(Guid id)
    {
        var task = await _context.TaskItems
            .AsNoTracking()
            .Include(t => t.Project)
            .Include(t => t.Assignee)
            .Include(t => t.Subtasks)
            .Include(t => t.Comments)
            .Include(t => t.Attachments)
            .Include(t => t.TaskTags).ThenInclude(tt => tt.Tag)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (task == null) return null;

        var response = new TaskDetailResponseDto
        {
            Id = task.Id,
            ProjectId = task.ProjectId,
            ProjectName = task.Project.Name,
            Title = task.Title,
            Description = task.Description,
            Status = task.Status.ToString(),
            Priority = FormatPriority(task.Priority),
            AssigneeId = task.AssigneeId,
            AssigneeName = task.Assignee?.Name,
            AssigneeAvatar = task.Assignee?.AvatarUrl,
            CreatorId = task.CreatorId,
            CreatedAt = task.CreatedAt,
            Deadline = task.Deadline,
            Tags = task.TaskTags.Select(tt => new ProjectFlow.Application.DTOs.Tags.TagResponseDto { Id = tt.TagId, Name = tt.Tag.Name }).ToList(),
            SubtaskCount = task.Subtasks.Count,
            CompletedSubtaskCount = task.Subtasks.Count(s => s.IsCompleted),
            CommentCount = task.Comments.Count,
            AttachmentCount = task.Attachments.Count,
            AttachmentsList = task.Attachments.Select(a => new AttachmentDto
            {
                Id = a.Id,
                Name = a.FileName,
                Url = a.Url,
                Type = a.FileType,
                FileSize = AttachmentDto.FormatFileSize(a.FileSize)
            }).ToList()
        };

        return response;
    }

    public async Task<TaskResponseDto?> UpdateAsync(Guid id, UpdateTaskFormDto input)
    {
        var task = await _context.TaskItems
            .Include(t => t.TaskTags)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (task == null) return null;

        task.Title = input.Title;
        task.Description = input.Description;
        task.Status = input.Status ?? "0";
        task.Priority = ParseTaskPriority(input.Priority);
        task.AssigneeId = input.AssigneeId;
        task.Deadline = input.Deadline;
        task.ProjectId = input.ProjectId;

        // Update tags
        if (input.TagNames != null)
        {
            _context.TaskTags.RemoveRange(task.TaskTags);
            foreach (var name in input.TagNames)
            {
                var tagName = name.Trim();
                if (string.IsNullOrEmpty(tagName)) continue;

                var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Name.ToLower() == tagName.ToLower());
                if (tag == null)
                {
                    tag = new Tag { Id = Guid.NewGuid(), Name = tagName };
                    _context.Tags.Add(tag);
                    await _context.SaveChangesAsync();
                }
                _context.TaskTags.Add(new TaskTag { TaskId = task.Id, TagId = tag.Id });
            }
        }

        // Handle new attachments
        if (input.NewAttachments != null && input.NewAttachments.Count > 0)
        {
            await _attachmentService.UploadMultipleAsync(input.NewAttachments, AttachmentSourceType.Task, task.Id, task.CreatorId);
        }

        await _context.SaveChangesAsync();
        
        return await MapToResponseDto(task);
    }

    public async Task<bool> UpdateStatusAsync(Guid id, string status)
    {
        var task = await _context.TaskItems.FindAsync(id);
        if (task == null) return false;

        task.Status = status;
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var task = await _context.TaskItems.FindAsync(id);
        if (task == null) return false;

        task.IsDeleted = true;
        await _context.SaveChangesAsync();

        return true;
    }

    private async Task<TaskResponseDto> MapToResponseDto(TaskItem task)
    {
        // Reload with includes
        var loaded = await _context.TaskItems
            .Include(t => t.Project)
            .Include(t => t.Assignee)
            .Include(t => t.Subtasks)
            .Include(t => t.Comments)
            .Include(t => t.Attachments)
            .Include(t => t.TaskTags).ThenInclude(tt => tt.Tag)
            .FirstAsync(t => t.Id == task.Id);

        return MapToResponseDtoFromLoaded(loaded);
    }

    private static TaskResponseDto MapToResponseDtoFromLoaded(TaskItem task) => new()
    {
        Id = task.Id,
        ProjectId = task.ProjectId,
        ProjectName = task.Project.Name,
        Title = task.Title,
        Description = task.Description,
        Status = task.Status.ToString(),
        Priority = FormatPriority(task.Priority),
        AssigneeId = task.AssigneeId,
        AssigneeName = task.Assignee?.Name,
        AssigneeAvatar = task.Assignee?.AvatarUrl,
        CreatorId = task.CreatorId,
        CreatedAt = task.CreatedAt,
        Deadline = task.Deadline,
        Tags = task.TaskTags.Select(tt => new ProjectFlow.Application.DTOs.Tags.TagResponseDto { Id = tt.TagId, Name = tt.Tag.Name }).ToList(),
        SubtaskCount = task.Subtasks.Count,
        CompletedSubtaskCount = task.Subtasks.Count(s => s.IsCompleted),
        CommentCount = task.Comments.Count,
        AttachmentCount = task.Attachments.Count
    };

    private static string FormatPriority(TaskItemPriority priority) => priority switch
    {
        TaskItemPriority.Low => "low",
        TaskItemPriority.Medium => "medium",
        TaskItemPriority.High => "high",
        TaskItemPriority.Urgent => "urgent",
        _ => "medium"
    };

    private static TaskItemPriority ParseTaskPriority(string priority) => priority.ToLower() switch
    {
        "low" => TaskItemPriority.Low,
        "medium" => TaskItemPriority.Medium,
        "high" => TaskItemPriority.High,
        "urgent" => TaskItemPriority.Urgent,
        _ => TaskItemPriority.Medium
    };
}

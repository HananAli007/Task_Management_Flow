using Microsoft.EntityFrameworkCore;
using ProjectFlow.Application.DTOs.Comments;
using ProjectFlow.Application.Interfaces;
using ProjectFlow.Domain.Entities;
using ProjectFlow.Domain.Enums;
using ProjectFlow.Application.DTOs;
using ProjectFlow.Infrastructure.Data;

namespace ProjectFlow.Infrastructure.Services;

public class CommentService : ICommentService
{
    private readonly AppDbContext _context;
    private readonly IAttachmentService _attachmentService;

    public CommentService(AppDbContext context, IAttachmentService attachmentService)
    {
        _context = context;
        _attachmentService = attachmentService;
    }

    public async Task<CommentResponseDto> CreateAsync(Guid taskId, CreateCommentDto input, Guid userId)
    {
        var taskExists = await _context.TaskItems.AnyAsync(t => t.Id == taskId);
        if (!taskExists)
            throw new InvalidOperationException("Task not found. Please provide a valid Task ID.");

        var user = await _context.Users.FindAsync(userId);

        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            TaskId = taskId,
            UserId = userId,
            Content = input.Content,
            CreatedAt = DateTime.UtcNow
        };

        _context.Comments.Add(comment);
        await _context.SaveChangesAsync();

        if (input.Attachments != null && input.Attachments.Count > 0)
        {
            await _attachmentService.UploadMultipleAsync(input.Attachments, AttachmentSourceType.Comment, comment.Id, userId);
        }

        // Fetch again to get attachments
        var result = await _context.Comments
            .Include(c => c.Attachments)
            .FirstOrDefaultAsync(c => c.Id == comment.Id);

        return new CommentResponseDto
        {
            Id = comment.Id,
            TaskId = comment.TaskId,
            UserId = comment.UserId,
            UserName = user?.Name ?? "Unknown User",
            Content = comment.Content,
            CreatedAt = comment.CreatedAt,
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

    public async Task<List<CommentResponseDto>> GetByTaskAsync(Guid taskId)
    {
        return await _context.Comments
            .Include(c => c.User)
            .Include(c => c.Attachments)
            .Where(c => c.TaskId == taskId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentResponseDto
            {
                Id = c.Id,
                TaskId = c.TaskId,
                UserId = c.UserId,
                UserName = c.User != null ? c.User.Name : "Unknown User",
                Content = c.Content,
                CreatedAt = c.CreatedAt,
                Attachments = c.Attachments.Select(a => new AttachmentDto
                {
                    Id = a.Id,
                    Name = a.FileName,
                    Url = a.Url,
                    Type = a.FileType,
                    FileSize = AttachmentDto.FormatFileSize(a.FileSize)
                }).ToList()
            }).ToListAsync();
    }
}

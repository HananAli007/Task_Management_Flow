using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ProjectFlow.Application.DTOs;
using ProjectFlow.Application.Interfaces;
using ProjectFlow.Domain.Entities;
using ProjectFlow.Domain.Enums;
using ProjectFlow.Infrastructure.Data;

namespace ProjectFlow.Infrastructure.Services;

public class AttachmentService : IAttachmentService
{
    private readonly AppDbContext _context;
    private readonly IFileStorageService _fileStorageService;

    public AttachmentService(AppDbContext context, IFileStorageService fileStorageService)
    {
        _context = context;
        _fileStorageService = fileStorageService;
    }

    public async Task<AttachmentDto> UploadAsync(IFormFile file, AttachmentSourceType sourceType, Guid sourceId, Guid uploaderId)
    {
        var (fileName, url, fileType) = await _fileStorageService.SaveFileAsync(file, sourceType.ToString().ToLower(), sourceId);
        
        var attachment = new Attachment
        {
            Id = Guid.NewGuid(),
            SourceType = sourceType,
            SourceId = sourceId,
            FileName = fileName,
            Url = url,
            FileType = fileType,
            FileSize = file.Length,
            UploaderId = uploaderId,
            CreatedAt = DateTime.UtcNow
        };

        // Link to specific entity navigation property for EF convenience
        switch (sourceType)
        {
            case AttachmentSourceType.Task:
                attachment.TaskItemId = sourceId;
                break;
            case AttachmentSourceType.Subtask:
                attachment.SubtaskId = sourceId;
                break;
            case AttachmentSourceType.Comment:
                attachment.CommentId = sourceId;
                break;
        }

        _context.Attachments.Add(attachment);
        await _context.SaveChangesAsync();

        return MapToDto(attachment);
    }

    public async Task<List<AttachmentDto>> UploadMultipleAsync(IFormFileCollection files, AttachmentSourceType sourceType, Guid sourceId, Guid uploaderId)
    {
        var dtos = new List<AttachmentDto>();
        foreach (var file in files)
        {
            dtos.Add(await UploadAsync(file, sourceType, sourceId, uploaderId));
        }
        return dtos;
    }

    public async Task<List<AttachmentDto>> GetBySourceAsync(AttachmentSourceType sourceType, Guid sourceId)
    {
        var attachments = await _context.Attachments
            .Where(a => a.SourceType == sourceType && a.SourceId == sourceId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return attachments.Select(MapToDto).ToList();
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var attachment = await _context.Attachments.FindAsync(id);
        if (attachment == null) return false;

        // Note: Real implementation should also delete the physical file using _fileStorageService
        _context.Attachments.Remove(attachment);
        await _context.SaveChangesAsync();
        return true;
    }

    private static AttachmentDto MapToDto(Attachment a) => new()
    {
        Id = a.Id,
        Name = a.FileName,
        Url = a.Url,
        Type = a.FileType,
        FileSize = AttachmentDto.FormatFileSize(a.FileSize)
    };
}

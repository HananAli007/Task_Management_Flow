using Microsoft.AspNetCore.Http;
using ProjectFlow.Application.DTOs;
using ProjectFlow.Domain.Enums;

namespace ProjectFlow.Application.Interfaces;

public interface IAttachmentService
{
    Task<AttachmentDto> UploadAsync(IFormFile file, AttachmentSourceType sourceType, Guid sourceId, Guid uploaderId);
    Task<List<AttachmentDto>> UploadMultipleAsync(IFormFileCollection files, AttachmentSourceType sourceType, Guid sourceId, Guid uploaderId);
    Task<List<AttachmentDto>> GetBySourceAsync(AttachmentSourceType sourceType, Guid sourceId);
    Task<bool> DeleteAsync(Guid id);
}

using Microsoft.AspNetCore.Http;

namespace ProjectFlow.Application.Interfaces;

public interface IFileStorageService
{
    Task<(string fileName, string url, string fileType)> SaveFileAsync(IFormFile file, string entityType, Guid entityId);
    Task<(string fileName, string url, string fileType)> SaveChatFileAsync(IFormFile file);
}

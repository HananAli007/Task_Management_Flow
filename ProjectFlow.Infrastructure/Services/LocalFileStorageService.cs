using Microsoft.AspNetCore.Http;
using ProjectFlow.Application.Interfaces;

namespace ProjectFlow.Infrastructure.Services;

public class LocalFileStorageService : IFileStorageService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public LocalFileStorageService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<(string fileName, string url, string fileType)> SaveFileAsync(
        IFormFile file, string entityType, Guid entityId)
    {
        var uploadsFolder = Path.Combine(
            Directory.GetCurrentDirectory(), "wwwroot", "uploads", entityType, entityId.ToString());

        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        var uniqueName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(uploadsFolder, uniqueName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var request = _httpContextAccessor.HttpContext!.Request;
        var baseUrl = $"{request.Scheme}://{request.Host}";
        var url = $"{baseUrl}/uploads/{entityType}/{entityId}/{uniqueName}";

        var fileType = GetFileType(file.ContentType);

        return (file.FileName, url, fileType);
    }

    public async Task<(string fileName, string url, string fileType)> SaveChatFileAsync(IFormFile file)
    {
        var chatFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "chat");

        if (!Directory.Exists(chatFolder))
            Directory.CreateDirectory(chatFolder);

        var uniqueName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(chatFolder, uniqueName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var request = _httpContextAccessor.HttpContext!.Request;
        var baseUrl = $"{request.Scheme}://{request.Host}";
        var url = $"{baseUrl}/uploads/chat/{uniqueName}";

        var fileType = GetFileType(file.ContentType);

        return (file.FileName, url, fileType);
    }

    private static string GetFileType(string contentType)
    {
        if (contentType.StartsWith("image/")) return "image";
        if (contentType.StartsWith("video/")) return "video";
        return "document";
    }
}

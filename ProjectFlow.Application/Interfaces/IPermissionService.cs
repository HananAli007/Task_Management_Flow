using ProjectFlow.Application.DTOs.Auth;

namespace ProjectFlow.Application.Interfaces;

public interface IPermissionService
{
    Task<UserPermissionManifestDto> GetPermissionManifestAsync(Guid userId);
    Task<bool> HasGlobalPermissionAsync(Guid userId, string screenName, string objectName);
    Task<bool> HasProjectPermissionAsync(Guid userId, Guid projectId, string screenName, string objectName);
}

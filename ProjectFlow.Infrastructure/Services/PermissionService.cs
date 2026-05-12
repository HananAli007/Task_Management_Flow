using Microsoft.EntityFrameworkCore;
using ProjectFlow.Application.DTOs.Auth;
using ProjectFlow.Application.Interfaces;
using ProjectFlow.Infrastructure.Data;

namespace ProjectFlow.Infrastructure.Services;

public class PermissionService : IPermissionService
{
    private readonly AppDbContext _context;

    public PermissionService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<UserPermissionManifestDto> GetPermissionManifestAsync(Guid userId)
    {
        var manifest = new UserPermissionManifestDto();

        // 1. Get User's Global Group
        var user = await _context.Users
            .Include(u => u.Group)
            .ThenInclude(g => g!.Permissions)
            .ThenInclude(p => p.Screen)
            .Include(u => u.Group)
            .ThenInclude(g => g!.Permissions)
            .ThenInclude(p => p.Object)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user?.Group != null)
        {
            manifest.GlobalPermissions = user.Group.Permissions
                .Select(p => new PermissionDto
                {
                    ScreenName = p.Screen.Description,
                    ObjectName = p.Object != null ? p.Object.Description : string.Empty,
                    Allowed = p.AllowPermission
                }).ToList();
        }

        // 2. Get User's Project Memberships and their Group Permissions
        var memberships = await _context.ProjectMembers
            .Include(pm => pm.Group)
            .ThenInclude(g => g!.Permissions)
            .ThenInclude(p => p.Screen)
            .Include(pm => pm.Group)
            .ThenInclude(g => g!.Permissions)
            .ThenInclude(p => p.Object)
            .Where(pm => pm.UserId == userId)
            .ToListAsync();

        foreach (var membership in memberships)
        {
            if (membership.Group != null)
            {
                manifest.ProjectPermissions[membership.ProjectId] = membership.Group.Permissions
                    .Select(p => new PermissionDto
                    {
                        ScreenName = p.Screen.Description,
                        ObjectName = p.Object != null ? p.Object.Description : string.Empty,
                        Allowed = p.AllowPermission
                    }).ToList();
            }
        }

        return manifest;
    }

    public async Task<bool> HasGlobalPermissionAsync(Guid userId, string screenName, string objectName)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user?.GroupId == null) return false;

        return await _context.AppScreenPermissions
            .AnyAsync(p => p.GroupId == user.GroupId &&
                           p.Screen.Description.ToLower() == screenName.ToLower() &&
                           (p.Object == null || p.Object.Description.ToLower() == objectName.ToLower()) &&
                           p.AllowPermission);
    }

    public async Task<bool> HasProjectPermissionAsync(Guid userId, Guid projectId, string screenName, string objectName)
    {
        var membership = await _context.ProjectMembers
            .FirstOrDefaultAsync(pm => pm.UserId == userId && pm.ProjectId == projectId);
        
        if (membership?.GroupId == null) return false;

        return await _context.AppScreenPermissions
            .AnyAsync(p => p.GroupId == membership.GroupId &&
                           p.Screen.Description.ToLower() == screenName.ToLower() &&
                           (p.Object == null || p.Object.Description.ToLower() == objectName.ToLower()) &&
                           p.AllowPermission);
    }
}

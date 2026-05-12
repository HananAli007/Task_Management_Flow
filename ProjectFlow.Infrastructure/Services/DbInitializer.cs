using Microsoft.EntityFrameworkCore;
using ProjectFlow.Domain.Entities;
using ProjectFlow.Infrastructure.Data;

namespace ProjectFlow.Infrastructure.Services;

public static class DbInitializer
{
    public static async Task SeedPermissionsAsync(AppDbContext context)
    {
        // 1. Ensure Screens exist
        var screenDescriptions = new[] { "Dashboard", "Projects", "Tasks", "Team", "Board" };
        foreach (var desc in screenDescriptions)
        {
            if (!await context.AppScreens.AnyAsync(s => s.Description == desc))
            {
                await context.AppScreens.AddAsync(new AppScreen { Description = desc });
            }
        }
        await context.SaveChangesAsync();
        var screens = await context.AppScreens.ToListAsync();

        // 2. Ensure Objects exist
        var objectDefinitions = new (string Screen, string Obj)[]
        {
            ("Projects", "Create_Project"), ("Projects", "Delete_Project"), ("Projects", "Edit_Project"),
            ("Tasks", "Create_Task"), ("Tasks", "Delete_Task"), ("Tasks", "Update_Task"),
            ("Team", "Invite_Member"), ("Team", "Remove_Member"), ("Team", "Change_Role")
        };

        foreach (var def in objectDefinitions)
        {
            var screen = screens.First(s => s.Description == def.Screen);
            if (!await context.AppScreenObjects.AnyAsync(o => o.Description == def.Obj))
            {
                await context.AppScreenObjects.AddAsync(new AppScreenObject { AppScreenId = screen.Id, Description = def.Obj });
            }
        }
        await context.SaveChangesAsync();
        var objects = await context.AppScreenObjects.ToListAsync();

        // 3. Ensure Groups exist
        var groupNames = new[] { "Super Admin", "Project Manager", "Team Member" };
        foreach (var name in groupNames)
        {
            if (!await context.AppGroups.AnyAsync(g => g.Description == name))
            {
                await context.AppGroups.AddAsync(new AppGroup { Description = name });
            }
        }
        await context.SaveChangesAsync();
        var groups = await context.AppGroups.ToListAsync();
        var superAdminGroup = groups.First(g => g.Description == "Super Admin");

        // 4. Ensure Super Admin has all permissions
        foreach (var screen in screens)
        {
            // View permission (Screen level)
            if (!await context.AppScreenPermissions.AnyAsync(p => p.GroupId == superAdminGroup.Id && p.AppScreenId == screen.Id && p.AppScreenObjectId == null))
            {
                await context.AppScreenPermissions.AddAsync(new AppScreenPermission
                {
                    GroupId = superAdminGroup.Id,
                    AppScreenId = screen.Id,
                    AppScreenObjectId = null,
                    AllowPermission = true
                });
            }

            // Object permissions (Actions)
            foreach (var obj in objects.Where(o => o.AppScreenId == screen.Id))
            {
                if (!await context.AppScreenPermissions.AnyAsync(p => p.GroupId == superAdminGroup.Id && p.AppScreenId == screen.Id && p.AppScreenObjectId == obj.Id))
                {
                    await context.AppScreenPermissions.AddAsync(new AppScreenPermission
                    {
                        GroupId = superAdminGroup.Id,
                        AppScreenId = screen.Id,
                        AppScreenObjectId = obj.Id,
                        AllowPermission = true
                    });
                }
            }
        }

        // 5. Ensure Team Member has basic permissions
        var memberGroup = groups.First(g => g.Description == "Team Member");
        var memberScreens = new[] { "Dashboard", "Projects", "Tasks", "Board" };
        foreach (var screenName in memberScreens)
        {
            var screen = screens.First(s => s.Description == screenName);
            if (!await context.AppScreenPermissions.AnyAsync(p => p.GroupId == memberGroup.Id && p.AppScreenId == screen.Id && p.AppScreenObjectId == null))
            {
                await context.AppScreenPermissions.AddAsync(new AppScreenPermission
                {
                    GroupId = memberGroup.Id,
                    AppScreenId = screen.Id,
                    AppScreenObjectId = null,
                    AllowPermission = true
                });
            }
        }
        await context.SaveChangesAsync();

        // 6. Ensure all users have a GroupId (Fix for existing users)
        var usersWithoutGroup = await context.Users.Where(u => u.GroupId == null).ToListAsync();
        foreach (var user in usersWithoutGroup)
        {
            // If role is admin, give Super Admin, else Team Member
            var targetGroup = user.Role.ToLower() == "admin" ? superAdminGroup : memberGroup;
            user.GroupId = targetGroup.Id;
        }
        await context.SaveChangesAsync();
    }
}

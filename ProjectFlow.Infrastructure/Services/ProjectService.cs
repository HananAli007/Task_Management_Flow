using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ProjectFlow.Application.DTOs.Projects;
using ProjectFlow.Application.Interfaces;
using ProjectFlow.Domain.Entities;
using ProjectFlow.Domain.Enums;
using ProjectFlow.Infrastructure.Data;

namespace ProjectFlow.Infrastructure.Services;

public class ProjectService : IProjectService
{
    private readonly AppDbContext _context;
    private readonly UserManager<AppUser> _userManager;

    public ProjectService(AppDbContext context, UserManager<AppUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task<ProjectResponseDto> CreateAsync(CreateProjectDto input, Guid creatorId)
    {
        var project = new Project
        {
            Id = Guid.NewGuid(),
            Name = input.Name,
            Description = input.Description,
            Status = ParseEnum<ProjectStatus>(input.Status),
            Priority = ParseEnum<ProjectPriority>(input.Priority),
            Deadline = input.Deadline,
            CreatorId = creatorId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Projects.Add(project);

        // Add creator as member
        _context.ProjectMembers.Add(new ProjectMember
        {
            ProjectId = project.Id,
            UserId = creatorId,
            Role = "owner"
        });

        // Add additional members (only those that actually exist)
        if (input.MemberIds != null && input.MemberIds.Any())
        {
            var validUserIds = await _context.Users
                .Where(u => input.MemberIds.Contains(u.Id))
                .Select(u => u.Id)
                .ToListAsync();

            foreach (var memberId in validUserIds.Where(id => id != creatorId))
            {
                _context.ProjectMembers.Add(new ProjectMember
                {
                    ProjectId = project.Id,
                    UserId = memberId,
                    Role = "member"
                });
            }
        }

        await _context.SaveChangesAsync();

        return await MapToResponseDto(project);
    }

    public async Task<List<ProjectResponseDto>> GetAllAsync(Guid userId)
    {
        // Using Refined Stored Procedure
        var results = await _context.Database
            .SqlQueryRaw<ProjectSpResult>("EXEC sp_GetUserProjects @UserId = {0}", userId)
            .ToListAsync();

        return results.Select(r => new ProjectResponseDto
        {
            Id = r.Id,
            Name = r.Name,
            Description = r.Description,
            Status = r.Status,
            Priority = r.Priority,
            Progress = r.Progress,
            TotalTasks = r.TotalTasks,
            CompletedTasks = r.CompletedTasks,
            CreatedAt = r.CreatedAt,
            Deadline = r.Deadline,
            MemberIds = string.IsNullOrEmpty(r.MemberIdsString)
                ? new List<Guid>()
                : r.MemberIdsString.Split(',').Select(Guid.Parse).ToList(),
            MemberNamesString = r.MemberNamesString,
            MemberAvatarsString = r.MemberAvatarsString
        }).ToList();
    }

    public async Task<ProjectResponseDto?> GetByIdAsync(Guid id)
    {
        var project = await _context.Projects
            .Include(p => p.Members)
            .Include(p => p.Tasks)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project == null) return null;

        return await MapToResponseDto(project);
    }

    public async Task<ProjectResponseDto?> UpdateAsync(Guid id, UpdateProjectDto input)
    {
        var project = await _context.Projects
            .Include(p => p.Members)
            .Include(p => p.Tasks)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project == null) return null;

        project.Name = input.Name;
        project.Description = input.Description;
        project.Status = ParseEnum<ProjectStatus>(input.Status);
        project.Priority = ParseEnum<ProjectPriority>(input.Priority);
        project.Deadline = input.Deadline;

        // Update members if provided (only those that actually exist)
        if (input.MemberIds != null && input.MemberIds.Any())
        {
            var validUserIds = await _context.Users
                .Where(u => input.MemberIds.Contains(u.Id))
                .Select(u => u.Id)
                .ToListAsync();

            var existingMemberIds = project.Members.Select(m => m.UserId).ToList();
            var newMemberIds = validUserIds.Except(existingMemberIds);

            foreach (var memberId in newMemberIds)
            {
                _context.ProjectMembers.Add(new ProjectMember
                {
                    ProjectId = project.Id,
                    UserId = memberId,
                    Role = "member"
                });
            }
        }

        await _context.SaveChangesAsync();

        return await MapToResponseDto(project);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var project = await _context.Projects
            .Include(p => p.Tasks)
                .ThenInclude(t => t.Subtasks)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project == null) return false;

        // Soft delete the project
        project.IsDeleted = true;

        // Soft delete all related tasks and subtasks
        foreach (var task in project.Tasks)
        {
            task.IsDeleted = true;
            foreach (var subtask in task.Subtasks)
            {
                subtask.IsDeleted = true;
            }
        }

        await _context.SaveChangesAsync();
        
        return true;
    }

    public async Task<bool> AddMemberAsync(Guid projectId, AddMemberDto input)
    {
        var user = await _userManager.FindByEmailAsync(input.Email);
        if (user == null)
            throw new InvalidOperationException("User with this email not found.");

        var exists = await _context.ProjectMembers
            .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == user.Id);

        if (exists)
            throw new InvalidOperationException("User is already a member of this project.");

        _context.ProjectMembers.Add(new ProjectMember
        {
            ProjectId = projectId,
            UserId = user.Id,
            Role = input.Role
        });

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<ProjectStatsDto?> GetStatsAsync(Guid id)
    {
        var project = await _context.Projects
            .Include(p => p.Tasks)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project == null) return null;

        var tasks = project.Tasks;
        var totalTasks = tasks.Count;
        var completedTasks = tasks.Count(t => t.Status == "3");
        var inProgressTasks = tasks.Count(t => t.Status == "1");
        var todoTasks = tasks.Count(t => t.Status == "0");

        var stats = new ProjectStatsDto
        {
            TotalTasks = totalTasks,
            CompletedTasks = completedTasks,
            InProgressTasks = inProgressTasks,
            TodoTasks = todoTasks,
            CompletionRate = totalTasks > 0 ? Math.Round((double)completedTasks / totalTasks * 100, 2) : 0,
            PriorityDistribution = tasks.GroupBy(t => t.Priority)
                .Select(g => new TaskPriorityStat
                {
                    Priority = g.Key.ToString().ToLower(),
                    Count = g.Count()
                }).ToList()
        };

        return stats;
    }

    private async Task<ProjectResponseDto> MapToResponseDto(Project project)
    {
        // Ensure Tasks are loaded
        if (!_context.Entry(project).Collection(p => p.Tasks).IsLoaded)
            await _context.Entry(project).Collection(p => p.Tasks).LoadAsync();
        if (!_context.Entry(project).Collection(p => p.Members).IsLoaded)
            await _context.Entry(project).Collection(p => p.Members).LoadAsync();

        var totalTasks = project.Tasks.Count;
        var completedTasks = project.Tasks.Count(t => t.Status == "3");
        var progress = totalTasks > 0 ? Math.Round((double)completedTasks / totalTasks, 2) : 0.0;

        return new ProjectResponseDto
        {
            Id = project.Id,
            Name = project.Name,
            Description = project.Description,
            Status = project.Status.ToString().ToLower(),
            Priority = project.Priority.ToString().ToLower(),
            Progress = progress,
            TotalTasks = totalTasks,
            CompletedTasks = completedTasks,
            MemberIds = project.Members.Select(m => m.UserId).ToList(),
            CreatedAt = project.CreatedAt,
            Deadline = project.Deadline
        };
    }

    private static T ParseEnum<T>(string value) where T : struct
    {
        // Convert snake_case input to PascalCase for enum parsing
        var pascalCase = string.Join("", value.Split('_').Select(s =>
            char.ToUpper(s[0]) + s.Substring(1).ToLower()));

        if (Enum.TryParse<T>(pascalCase, true, out var result))
            return result;

        throw new ArgumentException($"Invalid value '{value}' for {typeof(T).Name}");
    }
}

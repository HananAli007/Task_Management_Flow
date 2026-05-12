using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectFlow.Application.Interfaces;
using ProjectFlow.Application.DTOs.Common;
using System.Security.Claims;

namespace ProjectFlow.API.Controllers;

[ApiController]
[Route("api/Dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IProjectService _projectService;
    private readonly ITaskService _taskService;

    public DashboardController(IProjectService projectService, ITaskService taskService)
    {
        _projectService = projectService;
        _taskService = taskService;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        // You might have a specific DashboardStatsDto. 
        // For now, returning general stats or project-specific stats.
        var projects = await _projectService.GetAllAsync(userId);
        var tasks = await _taskService.GetMyTasksAsync(userId);

        return Ok(ApiResponse<object>.SuccessResult(new {
            total_projects = projects.Count,
            total_tasks = tasks.Count,
            completed_tasks = tasks.Count(t => t.Status.ToLower() == "done" || t.Status == "3"),
            pending_tasks = tasks.Count(t => t.Status.ToLower() != "done" && t.Status != "3")
        }));
    }
}


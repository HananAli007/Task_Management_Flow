using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectFlow.Application.DTOs.Common;
using ProjectFlow.Application.DTOs.Projects;
using ProjectFlow.Application.Interfaces;

namespace ProjectFlow.API.Controllers;

[ApiController]
[Route("api/Projects")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projectService;
    public ProjectsController(IProjectService projectService) { _projectService = projectService; }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>Projects_Create</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProjectDto input)
    {
        var result = await _projectService.CreateAsync(input, GetUserId());
        return StatusCode(201, ApiResponse<ProjectResponseDto>.SuccessResult(result, "Project created successfully."));
    }

    /// <summary>Projects_ListAll</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _projectService.GetAllAsync(GetUserId());
        return Ok(ApiResponse<List<ProjectResponseDto>>.SuccessResult(result));
    }

    /// <summary>Get Project by ID</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _projectService.GetByIdAsync(id);
        if (result == null) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "Project not found." } });
        return Ok(ApiResponse<ProjectResponseDto>.SuccessResult(result));
    }

    /// <summary>Update Project</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProjectDto input)
    {
        var result = await _projectService.UpdateAsync(id, input);
        if (result == null) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "Project not found." } });
        return Ok(ApiResponse<ProjectResponseDto>.SuccessResult(result, "Project updated successfully."));
    }

    /// <summary>Delete Project</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _projectService.DeleteAsync(id);
        if (!deleted) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "Project not found." } });
        return Ok(ApiResponse<object>.SuccessResult(null, "Project and its tasks deleted."));
    }

    /// <summary>Add Project Member</summary>
    [HttpPost("{projectId:guid}/members")]
    public async Task<IActionResult> AddMember(Guid projectId, [FromBody] AddMemberDto input)
    {
        await _projectService.AddMemberAsync(projectId, input);
        return Ok(ApiResponse<object>.SuccessResult(null, "Member added successfully."));
    }

    /// <summary>Get Project Stats</summary>
    [HttpGet("{id:guid}/stats")]
    public async Task<IActionResult> GetStats(Guid id)
    {
        var result = await _projectService.GetStatsAsync(id);
        if (result == null) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "Project not found." } });
        return Ok(ApiResponse<ProjectStatsDto>.SuccessResult(result));
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectFlow.Application.DTOs.Common;
using ProjectFlow.Application.DTOs.Projects;
using ProjectFlow.Application.Interfaces;

namespace ProjectFlow.API.Controllers;

[ApiController]
[Route("api/Members")]
[Authorize]
public class MembersController : ControllerBase
{
    private readonly IProjectService _projectService;
    private readonly IAuthService _authService;

    public MembersController(IProjectService projectService, IAuthService authService)
    {
        _projectService = projectService;
        _authService = authService;
    }

    /// <summary>Add Member to Project</summary>
    [HttpPost]
    public async Task<IActionResult> AddMember([FromBody] AddMemberDto input)
    {
        // Note: The input DTO might need ProjectId if it's not there.
        // Assuming AddMemberDto has ProjectId based on user's new request.
        await _projectService.AddMemberAsync(input.ProjectId, input);
        return Ok(ApiResponse<object>.SuccessResult(null, "Member added successfully."));
    }

    /// <summary>Search Members/Users</summary>
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string query)
    {
        var result = await _authService.SearchUsersAsync(query);
        return Ok(ApiResponse<object>.SuccessResult(result));
    }
}


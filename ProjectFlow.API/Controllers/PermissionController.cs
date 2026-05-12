using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using ProjectFlow.API.Hubs;
using ProjectFlow.Application.Interfaces;
using ProjectFlow.Application.DTOs.Common;
using ProjectFlow.Domain.Entities;
using ProjectFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ProjectFlow.API.Controllers;

[Authorize]
[ApiController]
[Route("api/Permission")]
public class PermissionController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<ChatHub> _hubContext;

    public PermissionController(AppDbContext context, IHubContext<ChatHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    [HttpGet("groups")]
    public async Task<IActionResult> GetGroups()
    {
        var groups = await _context.AppGroups.Where(g => g.Status == "A").ToListAsync();
        return Ok(ApiResponse<List<AppGroup>>.SuccessResult(groups));
    }

    [HttpPost("user/{userId}/group")]
    public async Task<IActionResult> UpdateUserGroup(Guid userId, [FromBody] int groupId)
    {
        var user = await _context.Users.FindAsync(userId.ToString());
        if (user == null) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "User not found." } });

        var groupExists = await _context.AppGroups.AnyAsync(g => g.Id == groupId);
        if (!groupExists) return BadRequest(new ApiErrorResponse { Error = new() { Code = "invalid_group", Message = "Invalid group ID." } });

        user.GroupId = groupId;
        await _context.SaveChangesAsync();

        // Trigger real-time update
        await _hubContext.Clients.Group(userId.ToString()).SendAsync("PermissionsUpdated");

        return Ok(ApiResponse<object>.SuccessResult(null, "User group updated successfully."));
    }
}


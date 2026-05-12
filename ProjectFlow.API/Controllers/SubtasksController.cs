using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectFlow.Application.DTOs.Common;
using ProjectFlow.Application.DTOs.Subtasks;
using ProjectFlow.Application.Interfaces;

namespace ProjectFlow.API.Controllers;

[ApiController]
[Route("api/Subtasks")]
[Authorize]
public class SubtasksController : ControllerBase
{
    private readonly ISubtaskService _subtaskService;
    public SubtasksController(ISubtaskService subtaskService) { _subtaskService = subtaskService; }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>Create Subtask with Attachments</summary>
    [HttpPost("task/{taskId:guid}")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create(Guid taskId, [FromForm] CreateSubtaskFormDto input)
    {
        var result = await _subtaskService.CreateAsync(taskId, input, GetUserId());
        return StatusCode(201, ApiResponse<SubtaskResponseDto>.SuccessResult(result, "Subtask created successfully."));
    }

    /// <summary>List Subtasks by Task</summary>
    [HttpGet("task/{taskId:guid}")]
    public async Task<IActionResult> GetByTask(Guid taskId)
    {
        var result = await _subtaskService.GetByTaskAsync(taskId);
        return Ok(ApiResponse<List<SubtaskResponseDto>>.SuccessResult(result));
    }

    /// <summary>Update Subtask</summary>
    [HttpPut("{id:guid}")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Update(Guid id, [FromForm] UpdateSubtaskFormDto input)
    {
        var result = await _subtaskService.UpdateAsync(id, input);
        if (result == null) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "Subtask not found." } });
        return Ok(ApiResponse<SubtaskResponseDto>.SuccessResult(result, "Subtask updated successfully."));
    }

    /// <summary>Delete Subtask</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _subtaskService.DeleteAsync(id);
        if (!deleted) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "Subtask not found." } });
        return Ok(ApiResponse<object>.SuccessResult(null, "Subtask deleted successfully."));
    }
}

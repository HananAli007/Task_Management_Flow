using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectFlow.Application.DTOs.Common;
using ProjectFlow.Application.DTOs.Tasks;
using ProjectFlow.Application.Interfaces;

namespace ProjectFlow.API.Controllers;

[ApiController]
[Route("api/Tasks")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;
    public TasksController(ITaskService taskService) { _taskService = taskService; }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>Tasks_Create — multipart/form-data</summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create([FromForm] CreateTaskFormDto input)
    {
        var result = await _taskService.CreateAsync(input, GetUserId());
        return StatusCode(201, ApiResponse<TaskResponseDto>.SuccessResult(result, "Task created successfully."));
    }

    /// <summary>List Tasks by Project</summary>
    [HttpGet("project/{projectId:guid}")]
    public async Task<IActionResult> GetByProject(Guid projectId)
    {
        var result = await _taskService.GetByProjectAsync(projectId);
        return Ok(ApiResponse<List<TaskResponseDto>>.SuccessResult(result));
    }

    /// <summary>List My Tasks</summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMyTasks()
    {
        var result = await _taskService.GetMyTasksAsync(GetUserId());
        return Ok(ApiResponse<List<TaskResponseDto>>.SuccessResult(result));
    }


    /// <summary>Get Task Details</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _taskService.GetByIdAsync(id);
        if (result == null) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "Task not found." } });
        return Ok(ApiResponse<TaskDetailResponseDto>.SuccessResult(result));
    }

    /// <summary>Update Task — multipart/form-data</summary>
    [HttpPut("{id:guid}")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Update(Guid id, [FromForm] UpdateTaskFormDto input)
    {
        var result = await _taskService.UpdateAsync(id, input, GetUserId());
        if (result == null) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "Task not found." } });
        return Ok(ApiResponse<TaskResponseDto>.SuccessResult(result, "Task updated successfully."));
    }

    /// <summary>Update Task Status</summary>
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> PatchStatus(Guid id, [FromBody] TaskStatusUpdateDto input)
    {
        var success = await _taskService.UpdateStatusAsync(id, input.Status, GetUserId());
        if (!success) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "Task not found." } });
        return Ok(ApiResponse<object>.SuccessResult(null, "Status updated successfully."));
    }

    /// <summary>Get Task Audit History</summary>
    [HttpGet("{id:guid}/history")]
    public async Task<IActionResult> GetHistory(Guid id)
    {
        var result = await _taskService.GetHistoryAsync(id);
        return Ok(ApiResponse<List<TaskHistoryResponseDto>>.SuccessResult(result));
    }

    /// <summary>Delete Task</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _taskService.DeleteAsync(id);
        if (!deleted) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "Task not found." } });
        return Ok(ApiResponse<object>.SuccessResult(null, "Task deleted successfully."));
    }
}

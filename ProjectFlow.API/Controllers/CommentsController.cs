using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectFlow.Application.DTOs.Comments;
using ProjectFlow.Application.DTOs.Common;
using ProjectFlow.Application.Interfaces;

namespace ProjectFlow.API.Controllers;

[ApiController]
[Route("api/Comments")]
[Authorize]
public class CommentsController : ControllerBase
{
    private readonly ICommentService _commentService;
    public CommentsController(ICommentService commentService) { _commentService = commentService; }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>Post Comment on Task</summary>
    [HttpPost("task/{taskId:guid}")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create(Guid taskId, [FromForm] CreateCommentDto input)
    {
        var result = await _commentService.CreateAsync(taskId, input, GetUserId());
        return StatusCode(201, ApiResponse<CommentResponseDto>.SuccessResult(result, "Comment posted successfully."));
    }

    /// <summary>List Comments by Task</summary>
    [HttpGet("task/{taskId:guid}")]
    public async Task<IActionResult> GetByTask(Guid taskId)
    {
        var result = await _commentService.GetByTaskAsync(taskId);
        return Ok(ApiResponse<List<CommentResponseDto>>.SuccessResult(result));
    }
}

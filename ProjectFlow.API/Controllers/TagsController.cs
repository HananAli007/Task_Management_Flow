using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectFlow.Application.DTOs.Common;
using ProjectFlow.Application.DTOs.Tags;
using ProjectFlow.Application.Interfaces;

namespace ProjectFlow.API.Controllers;

[ApiController]
[Route("api/Tags")]
[Authorize]
public class TagsController : ControllerBase
{
    private readonly ITagService _tagService;

    public TagsController(ITagService tagService)
    {
        _tagService = tagService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tags = await _tagService.GetAllAsync();
        return Ok(ApiResponse<List<TagResponseDto>>.SuccessResult(tags));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTagDto input)
    {
        var tag = await _tagService.CreateAsync(input);
        return StatusCode(201, ApiResponse<TagResponseDto>.SuccessResult(tag, "Tag created successfully."));
    }

    [HttpPost("assign/{taskId:guid}")]
    public async Task<IActionResult> Assign(Guid taskId, [FromBody] List<string> tagNames)
    {
        var success = await _tagService.AssignToTaskAsync(taskId, tagNames);
        if (!success) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "Task not found." } });
        return Ok(ApiResponse<object>.SuccessResult(null, "Tags assigned successfully."));
    }
}


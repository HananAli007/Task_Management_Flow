using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectFlow.Application.DTOs.Columns;
using ProjectFlow.Application.DTOs.Common;
using ProjectFlow.Application.Interfaces;

namespace ProjectFlow.API.Controllers;

[ApiController]
[Route("api/BoardLists")]
[Authorize]
public class ColumnsController : ControllerBase
{
    private readonly IColumnService _columnService;

    public ColumnsController(IColumnService columnService)
    {
        _columnService = columnService;
    }

    [HttpGet("project/{projectId:guid}")]
    public async Task<IActionResult> GetByProject(Guid projectId)
    {
        var result = await _columnService.GetByProjectAsync(projectId);
        return Ok(ApiResponse<List<ColumnResponseDto>>.SuccessResult(result));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateColumnDto input)
    {
        var result = await _columnService.CreateAsync(input);
        return StatusCode(201, ApiResponse<ColumnResponseDto>.SuccessResult(result, "Column created successfully."));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateColumnDto input)
    {
        var result = await _columnService.UpdateAsync(id, input);
        if (result == null) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "Column not found." } });
        return Ok(ApiResponse<ColumnResponseDto>.SuccessResult(result, "Column updated successfully."));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var success = await _columnService.DeleteAsync(id);
        if (!success) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "Column not found." } });
        return Ok(ApiResponse<object>.SuccessResult(null, "Column deleted successfully."));
    }
}

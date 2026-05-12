using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectFlow.Application.DTOs;
using ProjectFlow.Application.DTOs.Common;
using ProjectFlow.Application.Interfaces;
using ProjectFlow.Domain.Enums;

namespace ProjectFlow.API.Controllers;

[ApiController]
[Route("api/attachments")]
[Authorize]
public class AttachmentsController : ControllerBase
{
    private readonly IAttachmentService _attachmentService;

    public AttachmentsController(IAttachmentService attachmentService)
    {
        _attachmentService = attachmentService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>Upload multiple attachments</summary>
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload([FromForm] IFormFileCollection files, [FromForm] AttachmentSourceType sourceType, [FromForm] Guid sourceId)
    {
        if (files == null || files.Count == 0)
            return BadRequest(new ApiErrorResponse { Error = new() { Code = "bad_request", Message = "No files provided." } });

        var result = await _attachmentService.UploadMultipleAsync(files, sourceType, sourceId, GetUserId());
        return Ok(ApiResponse<List<AttachmentDto>>.SuccessResult(result, "Files uploaded successfully."));
    }

    /// <summary>Get attachments by source</summary>
    [HttpGet("{sourceType}/{sourceId:guid}")]
    public async Task<IActionResult> GetBySource(AttachmentSourceType sourceType, Guid sourceId)
    {
        var result = await _attachmentService.GetBySourceAsync(sourceType, sourceId);
        return Ok(ApiResponse<List<AttachmentDto>>.SuccessResult(result));
    }

    /// <summary>Delete attachment</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _attachmentService.DeleteAsync(id);
        if (!deleted)
            return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "Attachment not found." } });

        return Ok(ApiResponse<object>.SuccessResult(null, "Attachment deleted successfully."));
    }
}

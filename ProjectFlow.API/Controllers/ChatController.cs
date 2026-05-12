using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectFlow.Application.DTOs.Common;
using ProjectFlow.Application.Interfaces;

namespace ProjectFlow.API.Controllers;

[ApiController]
[Route("api/Chat")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;
    private readonly IAttachmentService _attachmentService;

    public ChatController(IChatService chatService, IAttachmentService attachmentService)
    {
        _chatService = chatService;
        _attachmentService = attachmentService;
    }

    /// <summary>Upload a file for chat</summary>
    [HttpPost("upload")]
    public async Task<IActionResult> UploadChatFile(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest(new ApiErrorResponse { Error = new() { Code = "bad_request", Message = "No file uploaded." } });
        
        var myIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(myIdStr)) return Unauthorized();
        var myId = Guid.Parse(myIdStr);

        // Record in Attachments table as Chat source
        var attachment = await _attachmentService.UploadAsync(file, ProjectFlow.Domain.Enums.AttachmentSourceType.Chat, Guid.Empty, myId);
        
        return Ok(ApiResponse<object>.SuccessResult(new { 
            file_name = attachment.Name, 
            url = attachment.Url, 
            file_type = attachment.Type 
        }, "File uploaded successfully."));
    }

    /// <summary>
    /// Chat_GetConversation — Get message history between logged-in user and another user.
    /// </summary>
    [HttpGet("{userId}")]
    public async Task<IActionResult> GetConversation(Guid userId)
    {
        var myIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(myIdStr)) return Unauthorized();
        var myId = Guid.Parse(myIdStr);

        var messages = await _chatService.GetConversationAsync(myId, userId);

        // Mark their messages as read
        await _chatService.MarkAsReadAsync(userId, myId);

        return Ok(ApiResponse<object>.SuccessResult(messages));
    }
}

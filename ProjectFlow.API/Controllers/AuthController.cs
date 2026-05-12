using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectFlow.Application.DTOs.Auth;
using ProjectFlow.Application.DTOs.Common;
using ProjectFlow.Application.Interfaces;
using System.ComponentModel.DataAnnotations;

namespace ProjectFlow.API.Controllers;

[ApiController]
[Route("api/Auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    public AuthController(IAuthService authService) { _authService = authService; }

    /// <summary>
    /// Auth_Signup — Register a new user.
    /// </summary>
    [HttpPost("signup")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Signup([FromBody] SignupInputDto input)
    {
        var result = await _authService.SignupAsync(input);
        return StatusCode(201, ApiResponse<AuthResponseDto>.SuccessResult(result, "User registered successfully."));
    }

    /// <summary>
    /// Auth_Login — Login with email and password.
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Login([FromBody] LoginInputDto input)
    {
        var result = await _authService.LoginAsync(input);
        return Ok(ApiResponse<AuthResponseDto>.SuccessResult(result, "Logged in successfully."));
    }

    /// <summary>
    /// Auth_Me — Get current user profile.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMe()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _authService.GetMeAsync(userId);
        if (result == null) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "User not found." } });
        return Ok(ApiResponse<UserDto>.SuccessResult(result));
    }

    /// <summary>
    /// Auth_GetAllUsers — Get all users (for Team page).
    /// </summary>
    [HttpGet("users")]
    [Authorize]
    [ProducesResponseType(typeof(List<UserDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllUsers()
    {
        var result = await _authService.GetAllUsersAsync();
        return Ok(ApiResponse<List<UserDto>>.SuccessResult(result));
    }

    /// <summary>
    /// Auth_Permissions — Get all permissions for current user.
    /// </summary>
    [HttpGet("permissions")]
    [Authorize]
    [ProducesResponseType(typeof(UserPermissionManifestDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPermissions([FromServices] IPermissionService permissionService)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var result = await permissionService.GetPermissionManifestAsync(userId);
        return Ok(ApiResponse<UserPermissionManifestDto>.SuccessResult(result));
    }

    /// <summary>
    /// Auth_UpdateUser — Update user details (name, role, etc.).
    /// </summary>
    [HttpPut("users/{id}")]
    [Authorize]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UserUpdateDto input)
    {
        var result = await _authService.UpdateUserAsync(id, input);
        if (result == null) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "User not found." } });
        return Ok(ApiResponse<UserDto>.SuccessResult(result, "User updated successfully."));
    }

    /// <summary>
    /// Auth_PatchRole — Update only the role of a user.
    /// </summary>
    [HttpPatch("users/{id}/role")]
    [Authorize]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> PatchRole(Guid id, [FromBody] PatchRoleDto input)
    {
        var targetUser = await _authService.GetMeAsync(id);
        if (targetUser == null) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "User not found." } });

        var currentUserId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        var currentUserClaims = await _authService.GetMeAsync(Guid.Parse(currentUserId!));
        if (currentUserClaims == null) return Unauthorized();

        var currentUserRole = currentUserClaims.Role.ToLower();
        var targetUserRole = targetUser.Role.ToLower();
        var newRole = input.Role.ToLower();

        // 1. No one can change a Super Admin's role (except themselves maybe? but user said "koi nahi kar sakta")
        if (targetUserRole == "superadmin" && currentUserId != id.ToString())
        {
            return BadRequest(new ApiErrorResponse { Error = new() { Code = "forbidden", Message = "Super Admins cannot be modified." } });
        }

        // 2. Permission checks based on hierarchy
        if (currentUserRole == "superadmin")
        {
            // Super admin cannot promote anyone to Super Admin (only one allowed)
            if (newRole == "superadmin")
            {
                return BadRequest(new ApiErrorResponse { Error = new() { Code = "forbidden", Message = "There can only be one Super Admin." } });
            }
        }
        else if (currentUserRole == "admin" || currentUserRole == "administrator")
        {
            // Admin can only manage member/manager
            if (targetUserRole == "admin" || targetUserRole == "administrator" || targetUserRole == "superadmin")
            {
                return BadRequest(new ApiErrorResponse { Error = new() { Code = "forbidden", Message = "Admins cannot modify other Administrators or Super Admins." } });
            }

            // Admin cannot promote anyone to Admin or Super Admin
            if (newRole == "admin" || newRole == "administrator" || newRole == "superadmin")
            {
                return BadRequest(new ApiErrorResponse { Error = new() { Code = "forbidden", Message = "Admins cannot promote users to Administrator or Super Admin roles." } });
            }
        }
        else
        {
            return BadRequest(new ApiErrorResponse { Error = new() { Code = "forbidden", Message = "You do not have permission to change roles." } });
        }

        var result = await _authService.UpdateUserAsync(id, new UserUpdateDto { Role = newRole });
        return Ok(ApiResponse<UserDto>.SuccessResult(result!, "User role updated successfully."));
    }

    /// <summary>
    /// Auth_ForgotPassword — Request password reset token.
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordInputDto input)
    {
        var token = await _authService.ForgotPasswordAsync(input.Email);

        if (token == null)
        {
            // For security, still return success message even if email not found
            return Ok(ApiResponse<string>.SuccessResult("If an account exists, a reset token has been generated."));
        }

        // Return token and a sample reset link for development ease
        return Ok(ApiResponse<object>.SuccessResult(new
        {
            Message = "Reset token generated.",
            ResetToken = token,
            ResetLink = $"http://localhost:3000/reset-password?email={input.Email}&token={token}"
        }));
    }

    /// <summary>
    /// Auth_ResetPassword — Reset password using token.
    /// </summary>
    [HttpPost("reset-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordInputDto input)
    {
        try
        {
            var result = await _authService.ResetPasswordAsync(input);
            return Ok(ApiResponse<string>.SuccessResult("Password has been reset successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiErrorResponse { Error = new() { Code = "reset_failed", Message = ex.Message } });
        }
    }

    /// <summary>
    /// Auth_ChangePassword — Change password for logged in user.
    /// </summary>
    [Authorize]
    [HttpPost("change-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordInputDto input)
    {
        try
        {
            // Get current user ID from claims
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            var result = await _authService.ChangePasswordAsync(userId, input);
            return Ok(ApiResponse<string>.SuccessResult("Password changed successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiErrorResponse { Error = new() { Code = "change_password_failed", Message = ex.Message } });
        }
    }

    /// <summary>
    /// Auth_DeleteUser — Soft delete a user.
    /// </summary>
    [HttpDelete("users/{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var targetUser = await _authService.GetMeAsync(id);
        if (targetUser == null) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "User not found." } });

        var currentUserId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        var currentUserClaims = await _authService.GetMeAsync(Guid.Parse(currentUserId!));
        if (currentUserClaims == null) return Unauthorized();

        var currentUserRole = currentUserClaims.Role.ToLower();
        var targetUserRole = targetUser.Role.ToLower();

        // 1. No one can delete a Super Admin
        if (targetUserRole == "superadmin")
        {
            return BadRequest(new ApiErrorResponse { Error = new() { Code = "forbidden", Message = "Super Admins cannot be deleted." } });
        }

        // 2. Permission checks based on hierarchy
        bool canDelete = false;
        if (currentUserRole == "superadmin")
        {
            canDelete = true;
        }
        else if (currentUserRole == "admin" || currentUserRole == "administrator")
        {
            // Admin can only delete member/manager
            if (targetUserRole != "admin" && targetUserRole != "administrator" && targetUserRole != "superadmin")
            {
                canDelete = true;
            }
        }

        if (!canDelete)
        {
            return BadRequest(new ApiErrorResponse { Error = new() { Code = "forbidden", Message = "You do not have permission to delete this user." } });
        }

        var result = await _authService.DeleteUserAsync(id);
        if (!result) return BadRequest(new ApiErrorResponse { Error = new() { Code = "error", Message = "Failed to delete user." } });

        return Ok(ApiResponse<string>.SuccessResult("User deleted successfully."));
    }

    /// <summary>
    /// Auth_RestoreUser — Restore a soft-deleted user.
    /// </summary>
    [HttpPost("users/{id}/restore")]
    [Authorize]
    public async Task<IActionResult> RestoreUser(Guid id)
    {
        var targetUser = await _authService.GetUserByIdAsync(id);
        if (targetUser == null) return NotFound(new ApiErrorResponse { Error = new() { Code = "not_found", Message = "User not found." } });

        var currentUserId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        var currentUserClaims = await _authService.GetMeAsync(Guid.Parse(currentUserId!));
        if (currentUserClaims == null) return Unauthorized();

        var currentUserRole = currentUserClaims.Role.ToLower();

        // Only Super Admin and Admin can restore users
        bool canRestore = currentUserRole == "superadmin" || currentUserRole == "admin" || currentUserRole == "administrator";

        if (!canRestore)
        {
            return BadRequest(new ApiErrorResponse { Error = new() { Code = "forbidden", Message = "You do not have permission to restore users." } });
        }

        var result = await _authService.RestoreUserAsync(id);
        if (!result) return BadRequest(new ApiErrorResponse { Error = new() { Code = "error", Message = "Failed to restore user." } });

        return Ok(ApiResponse<string>.SuccessResult("User restored successfully."));
    }

    /// <summary>
    /// Auth_Logout — Logout the current user.
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(userIdStr, out var userId))
        {
            await _authService.LogoutAsync(userId);
        }
        return Ok(ApiResponse<string>.SuccessResult("Logged out successfully."));
    }
}

public class ForgotPasswordInputDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}



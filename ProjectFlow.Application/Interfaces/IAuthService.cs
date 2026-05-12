using ProjectFlow.Application.DTOs.Auth;

namespace ProjectFlow.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> SignupAsync(SignupInputDto input);
    Task<AuthResponseDto> LoginAsync(LoginInputDto input);
    Task<UserDto?> GetMeAsync(Guid userId);
    Task<UserDto?> GetUserByIdAsync(Guid userId);
    Task<List<UserDto>> GetAllUsersAsync();
    Task<UserDto?> UpdateUserAsync(Guid userId, UserUpdateDto input);
    Task<string?> ForgotPasswordAsync(string email);
    Task<bool> ResetPasswordAsync(ResetPasswordInputDto input);
    Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordInputDto input);
    Task<bool> DeleteUserAsync(Guid userId);
    Task<bool> RestoreUserAsync(Guid userId);
    Task<List<UserDto>> SearchUsersAsync(string query);
    Task<bool> LogoutAsync(Guid userId);
}

using Microsoft.Extensions.Configuration;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ProjectFlow.Application.DTOs.Auth;
using ProjectFlow.Application.Interfaces;
using ProjectFlow.Domain.Entities;
using ProjectFlow.Infrastructure.Data;

namespace ProjectFlow.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<AppUser> _userManager;
    private readonly IConfiguration _configuration;
    private readonly AppDbContext _context;

    public AuthService(UserManager<AppUser> userManager, IConfiguration configuration, AppDbContext context)
    {
        _userManager = userManager;
        _configuration = configuration;
        _context = context;
    }

    public async Task<AuthResponseDto> SignupAsync(SignupInputDto input)
    {
        var existingUser = await _userManager.FindByEmailAsync(input.Email);
        if (existingUser != null)
            throw new InvalidOperationException("User already exists with this email.");

        var role = !string.IsNullOrEmpty(input.Role) ? input.Role.ToLower() : "member";
        
        // Find appropriate group
        var groupName = role == "admin" ? "Super Admin" : "Team Member";
        var group = await _context.AppGroups.FirstOrDefaultAsync(g => g.Description == groupName);

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Name = input.Name,
            Email = input.Email,
            UserName = input.Email,
            Phone = input.Phone,
            PhoneNumber = input.Phone,
            Role = role,
            GroupId = group?.Id, // Assign GroupId for permissions
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now
        };

        var result = await _userManager.CreateAsync(user, input.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Registration failed: {errors}");
        }

        var token = GenerateJwtToken(user);
        var refreshToken = GenerateRefreshToken();

        return new AuthResponseDto
        {
            Token = token,
            RefreshToken = refreshToken,
            User = MapToUserDto(user)
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginInputDto input)
    {
        var user = await _userManager.FindByEmailAsync(input.Email);
        if (user == null || user.IsDeleted)
            throw new InvalidOperationException("Invalid email or password.");

        var isPasswordValid = await _userManager.CheckPasswordAsync(user, input.Password);
        if (!isPasswordValid)
            throw new InvalidOperationException("Invalid email or password.");

        var token = GenerateJwtToken(user);
        var refreshToken = GenerateRefreshToken();

        return new AuthResponseDto
        {
            Token = token,
            RefreshToken = refreshToken,
            User = MapToUserDto(user)
        };
    }

    public async Task<UserDto?> GetMeAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted) return null;
        return MapToUserDto(user);
    }

    public async Task<UserDto?> GetUserByIdAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) return null;
        return MapToUserDto(user);
    }

    public async Task<List<UserDto>> GetAllUsersAsync()
    {
        var users = await _userManager.Users.ToListAsync();
        return users.Select(MapToUserDto).ToList();
    }

    public async Task<bool> DeleteUserAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) return false;

        user.IsDeleted = true;
        user.UpdatedAt = DateTime.Now;
        var result = await _userManager.UpdateAsync(user);
        return result.Succeeded;
    }

    public async Task<bool> RestoreUserAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) return false;

        user.IsDeleted = false;
        user.UpdatedAt = DateTime.Now;
        var result = await _userManager.UpdateAsync(user);
        return result.Succeeded;
    }

    public async Task<UserDto?> UpdateUserAsync(Guid userId, UserUpdateDto input)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted) return null;

        if (!string.IsNullOrEmpty(input.Name)) user.Name = input.Name;
        if (!string.IsNullOrEmpty(input.Email))
        {
            user.Email = input.Email;
            user.UserName = input.Email;
        }
        if (!string.IsNullOrEmpty(input.Phone))
        {
            user.Phone = input.Phone;
            user.PhoneNumber = input.Phone;
        }
        if (!string.IsNullOrEmpty(input.Role)) user.Role = input.Role;
        if (!string.IsNullOrEmpty(input.AvatarUrl)) user.AvatarUrl = input.AvatarUrl;

        user.UpdatedAt = DateTime.Now;
        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded) return null;

        return MapToUserDto(user);
    }

    public async Task<string?> ForgotPasswordAsync(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null || user.IsDeleted) return null;

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);

        // Log the request to DB
        var resetLog = new PasswordResetLog
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Email = email,
            Token = token,
            ExpiresAt = DateTime.Now.AddHours(1),
            IsUsed = false
        };

        _context.PasswordResetLogs.Add(resetLog);
        await _context.SaveChangesAsync();

        return token;
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordInputDto input)
    {
        var user = await _userManager.FindByEmailAsync(input.Email);
        if (user == null || user.IsDeleted) throw new InvalidOperationException("User not found.");

        // Verify log entry
        var log = await _context.PasswordResetLogs
            .FirstOrDefaultAsync(l => l.Email.ToLower() == input.Email.ToLower() && l.Token.Trim() == input.Token.Trim() && !l.IsUsed && l.ExpiresAt > DateTime.Now);

        if (log == null) throw new InvalidOperationException("The reset token is invalid, already used, or has expired.");

        var result = await _userManager.ResetPasswordAsync(user, input.Token.Trim(), input.NewPassword);

        if (result.Succeeded)
        {
            log.IsUsed = true;
            await _context.SaveChangesAsync();
            return true;
        }

        var errors = string.Join(", ", result.Errors.Select(e => e.Description));
        throw new InvalidOperationException($"Reset failed: {errors}");
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordInputDto input)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) throw new InvalidOperationException("User not found.");

        var result = await _userManager.ChangePasswordAsync(user, input.CurrentPassword, input.NewPassword);

        if (result.Succeeded) return true;

        var errors = string.Join(", ", result.Errors.Select(e => e.Description));
        throw new InvalidOperationException($"Password change failed: {errors}");
    }

    private string GenerateJwtToken(AppUser user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtSettings:SecretKey"] ?? "ProjectFlowSuperSecretKey123!"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("role", user.Role)
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["JwtSettings:Issuer"],
            audience: _configuration["JwtSettings:Audience"],
            claims: claims,
            expires: DateTime.Now.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    private static UserDto MapToUserDto(AppUser user) => new()
    {
        Id = user.Id,
        Name = user.Name,
        Email = user.Email!,
        IsDeleted = user.IsDeleted,
        Role = user.Role,
        Phone = user.Phone,
        CreatedAt = user.CreatedAt,
        UpdatedAt = user.UpdatedAt,
        AvatarUrl = user.AvatarUrl
    };

    public async Task<List<UserDto>> SearchUsersAsync(string query)
    {
        if (string.IsNullOrWhiteSpace(query)) return new List<UserDto>();

        var q = query.ToLower();
        var users = await _userManager.Users
            .Where(u => !u.IsDeleted && (u.Name.ToLower().Contains(q) || (u.Email != null && u.Email.ToLower().Contains(q))))
            .Take(20)
            .ToListAsync();

        return users.Select(MapToUserDto).ToList();
    }

    public async Task<bool> LogoutAsync(Guid userId)
    {
        // In a stateless JWT setup, logout is primarily handled by the client 
        // by clearing the token. For a more robust setup, you would invalidate 
        // refresh tokens here if they were stored in the DB.
        return await Task.FromResult(true);
    }
}

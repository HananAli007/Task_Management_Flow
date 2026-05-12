using System;

namespace ProjectFlow.Domain.Entities
{
    public class PasswordResetLog
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public DateTime RequestedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public bool IsUsed { get; set; } = false;

        // Navigation property
        public AppUser User { get; set; } = null!;
    }
}

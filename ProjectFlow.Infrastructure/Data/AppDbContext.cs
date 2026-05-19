using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ProjectFlow.Domain.Entities;

namespace ProjectFlow.Infrastructure.Data;

public class AppDbContext : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<TaskItem> TaskItems => Set<TaskItem>();
    public DbSet<Subtask> Subtasks => Set<Subtask>();
    public DbSet<Attachment> Attachments => Set<Attachment>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<TaskTag> TaskTags => Set<TaskTag>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<PasswordResetLog> PasswordResetLogs => Set<PasswordResetLog>();
    public DbSet<BoardColumn> BoardColumns => Set<BoardColumn>();
    public DbSet<TaskHistory> TaskHistories => Set<TaskHistory>();

    // Permission System
    public DbSet<AppGroup> AppGroups => Set<AppGroup>();
    public DbSet<AppScreen> AppScreens => Set<AppScreen>();
    public DbSet<AppScreenObject> AppScreenObjects => Set<AppScreenObject>();
    public DbSet<AppScreenPermission> AppScreenPermissions => Set<AppScreenPermission>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // ===== AppUser =====
        builder.Entity<AppUser>(e =>
        {
            e.Property(u => u.Name).HasMaxLength(200).IsRequired().HasColumnOrder(1);
            e.Property(u => u.IsDeleted).HasDefaultValue(false).HasColumnOrder(2);
            e.Property(u => u.Role).HasMaxLength(50).HasColumnOrder(3);
            e.Property(u => u.Phone).HasMaxLength(20).HasColumnOrder(4);
            e.Property(u => u.CreatedAt).HasDefaultValueSql("GETDATE()").HasColumnOrder(5);
            e.Property(u => u.UpdatedAt).HasDefaultValueSql("GETDATE()").HasColumnOrder(6);
            e.Property(u => u.AvatarUrl).HasMaxLength(500).HasColumnOrder(20);

            e.HasOne(u => u.Group)
                .WithMany(g => g.Users)
                .HasForeignKey(u => u.GroupId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ===== Permission System Configuration =====
        builder.Entity<AppGroup>(e =>
        {
            e.HasKey(g => g.Id);
            e.Property(g => g.Description).HasMaxLength(200).IsRequired();
            e.Property(g => g.Status).HasMaxLength(1).HasDefaultValue("A");
        });

        builder.Entity<AppScreen>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Description).HasMaxLength(200).IsRequired();
            e.Property(s => s.Status).HasMaxLength(1).HasDefaultValue("A");
        });

        builder.Entity<AppScreenObject>(e =>
        {
            e.HasKey(o => o.Id);
            e.Property(o => o.Description).HasMaxLength(200).IsRequired();
            e.Property(o => o.Status).HasMaxLength(1).HasDefaultValue("A");

            e.HasOne(o => o.Screen)
                .WithMany(s => s.Objects)
                .HasForeignKey(o => o.AppScreenId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<AppScreenPermission>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.AllowPermission).HasDefaultValue(false);

            e.HasOne(p => p.Group)
                .WithMany(g => g.Permissions)
                .HasForeignKey(p => p.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(p => p.Screen)
                .WithMany()
                .HasForeignKey(p => p.AppScreenId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.Object)
                .WithMany()
                .HasForeignKey(p => p.AppScreenObjectId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ===== Project =====
        builder.Entity<Project>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Name).HasMaxLength(300).IsRequired();
            e.Property(p => p.Description).HasMaxLength(2000);
            e.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(p => p.Priority).HasConversion<string>().HasMaxLength(20);
            e.Property(p => p.CreatedAt).HasDefaultValueSql("GETDATE()");
            e.Property(p => p.IsDeleted).HasDefaultValue(false);
            e.HasQueryFilter(p => !p.IsDeleted);

            e.HasOne(p => p.Creator)
                .WithMany()
                .HasForeignKey(p => p.CreatorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ===== ProjectMember =====
        builder.Entity<ProjectMember>(e =>
        {
            e.HasKey(pm => pm.Id);
            e.HasIndex(pm => new { pm.ProjectId, pm.UserId }).IsUnique();
            e.Property(pm => pm.Role).HasMaxLength(50).HasDefaultValue("member");

            e.HasOne(pm => pm.Project)
                .WithMany(p => p.Members)
                .HasForeignKey(pm => pm.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(pm => pm.User)
                .WithMany(u => u.ProjectMemberships)
                .HasForeignKey(pm => pm.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(pm => pm.Group)
                .WithMany()
                .HasForeignKey(pm => pm.GroupId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ===== TaskItem =====
        builder.Entity<TaskItem>(e =>
        {
            e.HasKey(t => t.Id);
            e.Property(t => t.IsDeleted).HasDefaultValue(false);
            e.HasQueryFilter(t => !t.IsDeleted);
            e.Property(t => t.Title).HasMaxLength(500).IsRequired();
            e.Property(t => t.Description).HasMaxLength(5000);
            e.Property(t => t.Status)
                .HasMaxLength(50)
                .IsRequired()
                .HasConversion(
                    v => v, // To DB (keep as string, EF handles conversion to int if column is int)
                    v => v // From DB (keep as string)
                );
            e.Property(t => t.Priority).HasConversion<string>().HasMaxLength(20);
            e.Property(t => t.CreatedAt).HasDefaultValueSql("GETDATE()");

            e.HasOne(t => t.Project)
                .WithMany(p => p.Tasks)
                .HasForeignKey(t => t.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(t => t.Assignee)
                .WithMany(u => u.AssignedTasks)
                .HasForeignKey(t => t.AssigneeId)
                .OnDelete(DeleteBehavior.SetNull);

            e.HasOne(t => t.Creator)
                .WithMany(u => u.CreatedTasks)
                .HasForeignKey(t => t.CreatorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ===== Subtask =====
        builder.Entity<Subtask>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Title).HasMaxLength(500).IsRequired();
            e.Property(s => s.CreatedAt).HasDefaultValueSql("GETDATE()");
            e.Property(s => s.IsDeleted).HasDefaultValue(false);
            e.HasQueryFilter(s => !s.IsDeleted);

            e.HasOne(s => s.Task)
                .WithMany(t => t.Subtasks)
                .HasForeignKey(s => s.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(s => s.Assignee)
                .WithMany()
                .HasForeignKey(s => s.AssigneeId)
                .OnDelete(DeleteBehavior.SetNull);

            e.HasOne(s => s.Creator)
                .WithMany()
                .HasForeignKey(s => s.CreatorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ===== Attachment =====
        builder.Entity<Attachment>(e =>
        {
            e.HasKey(a => a.Id);
            e.Property(a => a.SourceType).HasConversion<string>().HasMaxLength(20).IsRequired();
            e.Property(a => a.FileName).HasMaxLength(500).IsRequired();
            e.Property(a => a.Url).HasMaxLength(1000).IsRequired();
            e.Property(a => a.FileType).HasMaxLength(50);
            e.Property(a => a.FileSize).IsRequired();
            e.Property(a => a.CreatedAt).HasDefaultValueSql("GETDATE()");

            e.HasOne(a => a.Uploader)
                .WithMany()
                .HasForeignKey(a => a.UploaderId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(a => a.TaskItem)
                .WithMany(t => t.Attachments)
                .HasForeignKey(a => a.TaskItemId)
                .OnDelete(DeleteBehavior.NoAction);

            e.HasOne(a => a.Subtask)
                .WithMany(s => s.Attachments)
                .HasForeignKey(a => a.SubtaskId)
                .OnDelete(DeleteBehavior.NoAction);

            e.HasOne(a => a.Comment)
                .WithMany(c => c.Attachments)
                .HasForeignKey(a => a.CommentId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // ===== Comment =====
        builder.Entity<Comment>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.Content).HasMaxLength(5000).IsRequired();
            e.Property(c => c.CreatedAt).HasDefaultValueSql("GETDATE()");

            e.HasOne(c => c.Task)
                .WithMany(t => t.Comments)
                .HasForeignKey(c => c.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(c => c.User)
                .WithMany(u => u.Comments)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ===== Tag =====
        builder.Entity<Tag>(e =>
        {
            e.HasKey(t => t.Id);
            e.Property(t => t.Name).HasMaxLength(100).IsRequired();
            e.HasIndex(t => t.Name).IsUnique();
        });

        // ===== TaskTag (Many-to-Many) =====
        builder.Entity<TaskTag>(e =>
        {
            e.HasKey(tt => new { tt.TaskId, tt.TagId });

            e.HasOne(tt => tt.Task)
                .WithMany(t => t.TaskTags)
                .HasForeignKey(tt => tt.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(tt => tt.Tag)
                .WithMany(t => t.TaskTags)
                .HasForeignKey(tt => tt.TagId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== ChatMessage =====
        builder.Entity<ChatMessage>(e =>
        {
            e.HasKey(m => m.Id);
            e.Property(m => m.Content).HasMaxLength(4000).IsRequired();
            e.HasIndex(m => new { m.SenderId, m.ReceiverId });
            e.Property(m => m.SentAt).HasDefaultValueSql("GETDATE()");
            e.HasIndex(m => m.SentAt);

            e.HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(m => m.Receiver)
                .WithMany()
                .HasForeignKey(m => m.ReceiverId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ===== PasswordResetLog =====
        builder.Entity<PasswordResetLog>(e =>
        {
            e.HasKey(l => l.Id);
            e.Property(l => l.Email).HasMaxLength(256).IsRequired();
            e.Property(l => l.Token).HasMaxLength(1000).IsRequired();
            e.HasOne(l => l.User)
                .WithMany()
                .HasForeignKey(l => l.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.Property(l => l.RequestedAt).HasDefaultValueSql("GETDATE()");
        });

        // ===== BoardColumn =====
        builder.Entity<BoardColumn>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.Id).ValueGeneratedOnAdd();
            e.Property(c => c.Title).HasMaxLength(100).IsRequired();
            e.Property(c => c.OrderIndex).HasDefaultValue(0);
            e.Property(c => c.Color).HasMaxLength(50);
            e.Property(c => c.IsDeleted).HasDefaultValue(false);
            e.HasQueryFilter(c => !c.IsDeleted);

            e.HasOne(c => c.Project)
                .WithMany()
                .HasForeignKey(c => c.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== TaskHistory =====
        builder.Entity<TaskHistory>(e =>
        {
            e.HasKey(th => th.Id);
            e.Property(th => th.Action).HasMaxLength(50).IsRequired();
            e.Property(th => th.Details).HasMaxLength(1000);
            e.Property(th => th.CreatedAt).HasDefaultValueSql("GETDATE()");

            e.HasOne(th => th.Task)
                .WithMany()
                .HasForeignKey(th => th.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(th => th.User)
                .WithMany()
                .HasForeignKey(th => th.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}

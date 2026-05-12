using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectFlow.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStoredProcedures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. sp_GetUserProjects
            migrationBuilder.Sql(@"
                CREATE PROCEDURE sp_GetUserProjects
                    @UserId UNIQUEIDENTIFIER
                AS
                BEGIN
                    SELECT 
                        p.Id, p.Name, p.Description, 
                        LOWER(CAST(p.Status AS NVARCHAR(20))) AS Status, 
                        LOWER(CAST(p.Priority AS NVARCHAR(20))) AS Priority, 
                        p.CreatedAt, p.Deadline,
                        (SELECT COUNT(*) FROM TaskItems t WHERE t.ProjectId = p.Id) AS TotalTasks,
                        (SELECT COUNT(*) FROM TaskItems t WHERE t.ProjectId = p.Id AND t.Status = 'Completed') AS CompletedTasks
                    FROM Projects p
                    INNER JOIN ProjectMembers pm ON p.Id = pm.ProjectId
                    WHERE pm.UserId = @UserId
                    ORDER BY p.CreatedAt DESC
                END");

            // 2. sp_GetProjectTasks
            migrationBuilder.Sql(@"
                CREATE PROCEDURE sp_GetProjectTasks
                    @ProjectId UNIQUEIDENTIFIER
                AS
                BEGIN
                    SELECT 
                        t.Id, t.ProjectId, p.Name AS ProjectName, t.Title, t.Description, 
                        LOWER(CAST(t.Status AS NVARCHAR(20))) AS Status, 
                        LOWER(CAST(t.Priority AS NVARCHAR(20))) AS Priority, 
                        t.AssigneeId, u.Name AS AssigneeName, u.AvatarUrl AS AssigneeAvatar,
                        t.CreatorId, t.CreatedAt, t.Deadline,
                        (SELECT COUNT(*) FROM Subtasks s WHERE s.TaskId = t.Id) AS SubtaskCount,
                        (SELECT COUNT(*) FROM Subtasks s WHERE s.TaskId = t.Id AND s.IsCompleted = 1) AS CompletedSubtaskCount,
                        (SELECT COUNT(*) FROM Comments c WHERE c.TaskId = t.Id) AS CommentCount,
                        (SELECT COUNT(*) FROM Attachments a WHERE a.TaskItemId = t.Id) AS AttachmentCount
                    FROM TaskItems t
                    INNER JOIN Projects p ON t.ProjectId = p.Id
                    LEFT JOIN AspNetUsers u ON t.AssigneeId = u.Id
                    WHERE t.ProjectId = @ProjectId
                    ORDER BY t.CreatedAt DESC
                END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetUserProjects");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetProjectTasks");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectFlow.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RefineStoredProcedures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Refine sp_GetUserProjects
            migrationBuilder.Sql(@"
                ALTER PROCEDURE sp_GetUserProjects
                    @UserId UNIQUEIDENTIFIER
                AS
                BEGIN
                    SELECT 
                        p.Id, p.Name, p.Description, 
                        LOWER(CAST(p.Status AS NVARCHAR(20))) AS Status, 
                        LOWER(CAST(p.Priority AS NVARCHAR(20))) AS Priority, 
                        p.CreatedAt, p.Deadline,
                        (SELECT COUNT(*) FROM TaskItems t WHERE t.ProjectId = p.Id) AS TotalTasks,
                        (SELECT COUNT(*) FROM TaskItems t WHERE t.ProjectId = p.Id AND t.Status = 'Completed') AS CompletedTasks,
                        CAST(CASE WHEN (SELECT COUNT(*) FROM TaskItems t WHERE t.ProjectId = p.Id) > 0 
                             THEN CAST((SELECT COUNT(*) FROM TaskItems t WHERE t.ProjectId = p.Id AND t.Status = 'Completed') AS FLOAT) / 
                                  (SELECT COUNT(*) FROM TaskItems t WHERE t.ProjectId = p.Id)
                             ELSE 0 END AS FLOAT) AS Progress,
                        (SELECT STRING_AGG(CAST(pm.UserId AS NVARCHAR(MAX)), ',') 
                         FROM ProjectMembers pm WHERE pm.ProjectId = p.Id) AS MemberIdsString
                    FROM Projects p
                    INNER JOIN ProjectMembers pm ON p.Id = pm.ProjectId
                    WHERE pm.UserId = @UserId
                    ORDER BY p.CreatedAt DESC
                END");

            // Refine sp_GetProjectTasks
            migrationBuilder.Sql(@"
                ALTER PROCEDURE sp_GetProjectTasks
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
                        (SELECT COUNT(*) FROM Attachments a WHERE a.TaskItemId = t.Id) AS AttachmentCount,
                        (SELECT STRING_AGG(tg.Name, ',') 
                         FROM TaskTags tt INNER JOIN Tags tg ON tt.TagId = tg.Id 
                         WHERE tt.TaskId = t.Id) AS TagNamesString
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
            // Down logic omitted for brevity as this is a refinement migration
        }
    }
}

-- ADDING sp_GetMyTasks FOR DASHBOARD PERFORMANCE
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_GetMyTasks]
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        t.Id,
        t.ProjectId,
        p.Name as ProjectName,
        t.Title,
        t.Description,
        t.Status,
        ISNULL(c.Title, t.Status) as StatusName,
        ISNULL(c.SystemStatus, 0) as SystemStatus,
        t.Priority,
        t.AssigneeId,
        u.Name as AssigneeName,
        u.AvatarUrl as AssigneeAvatar,
        t.CreatorId,
        t.CreatedAt,
        t.Deadline,
        t.IsDeleted,
        (SELECT COUNT(*) FROM Subtasks s WHERE s.TaskId = t.Id AND ISNULL(s.IsDeleted, 0) = 0) as SubtaskCount,
        (SELECT COUNT(*) FROM Subtasks s WHERE s.TaskId = t.Id AND s.IsCompleted = 1 AND ISNULL(s.IsDeleted, 0) = 0) as CompletedSubtaskCount,
        (SELECT COUNT(*) FROM Comments cm WHERE cm.TaskId = t.Id) as CommentCount,
        (SELECT COUNT(*) FROM Attachments a WHERE a.TaskItemId = t.Id) as AttachmentCount,
        (SELECT STRING_AGG(tg.Name, ',') FROM TaskTags tt JOIN Tags tg ON tt.TagId = tg.Id WHERE tt.TaskId = t.Id) as TagNamesString
    FROM TaskItems t
    INNER JOIN Projects p ON t.ProjectId = p.Id
    LEFT JOIN BoardColumns c ON t.Status = CAST(c.Id AS NVARCHAR(50))
    LEFT JOIN AspNetUsers u ON t.AssigneeId = u.Id
    WHERE (t.AssigneeId = @UserId OR t.CreatorId = @UserId) AND ISNULL(t.IsDeleted, 0) = 0
    ORDER BY t.CreatedAt DESC;
END
GO

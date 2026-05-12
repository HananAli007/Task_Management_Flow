-- PROJECTFLOW DATABASE SYNC & OPTIMIZATION
-- This is a consolidated script for all database fixes (Progress, Members, Status).

-- 1. Ensure IsDeleted columns exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Projects]') AND name = N'IsDeleted')
    ALTER TABLE [dbo].[Projects] ADD [IsDeleted] BIT NOT NULL DEFAULT 0;
UPDATE [dbo].[Projects] SET [IsDeleted] = 0 WHERE [IsDeleted] IS NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TaskItems]') AND name = N'IsDeleted')
    ALTER TABLE [dbo].[TaskItems] ADD [IsDeleted] BIT NOT NULL DEFAULT 0;
UPDATE [dbo].[TaskItems] SET [IsDeleted] = 0 WHERE [IsDeleted] IS NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Subtasks]') AND name = N'IsDeleted')
    ALTER TABLE [dbo].[Subtasks] ADD [IsDeleted] BIT NOT NULL DEFAULT 0;
UPDATE [dbo].[Subtasks] SET [IsDeleted] = 0 WHERE [IsDeleted] IS NULL;

-- 2. sp_GetUserProjects: Optimized for Dashboard & Projects Page
GO
ALTER PROCEDURE [dbo].[sp_GetUserProjects]
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        p.Id,
        p.Name,
        p.Description,
        p.Status,
        p.Priority,
        p.Deadline,
        p.CreatedAt,
        ISNULL(p.IsDeleted, 0) as IsDeleted,
        (SELECT COUNT(*) FROM TaskItems t WHERE t.ProjectId = p.Id AND ISNULL(t.IsDeleted, 0) = 0) as TotalTasks,
        (SELECT COUNT(*) FROM TaskItems t 
         LEFT JOIN BoardColumns c ON t.Status = CAST(c.Id AS NVARCHAR(50)) 
         WHERE t.ProjectId = p.Id AND (c.SystemStatus = 3 OR t.Status = '3') AND ISNULL(t.IsDeleted, 0) = 0) as CompletedTasks,
        -- Progress as 0-100 percentage
        (SELECT 
            CASE 
                WHEN total_tasks = 0 THEN 0 
                ELSE CAST(completed_tasks AS FLOAT) * 100 / total_tasks 
            END
         FROM (
            SELECT 
                (SELECT COUNT(*) FROM TaskItems t WHERE t.ProjectId = p.Id AND ISNULL(t.IsDeleted, 0) = 0) as total_tasks,
                (SELECT COUNT(*) FROM TaskItems t LEFT JOIN BoardColumns c ON t.Status = CAST(c.Id AS NVARCHAR(50)) 
                 WHERE t.ProjectId = p.Id AND (c.SystemStatus = 3 OR t.Status = '3') AND ISNULL(t.IsDeleted, 0) = 0) as completed_tasks
         ) as sub) as Progress,
        -- Member details for UI (Avatar circles)
        (SELECT STRING_AGG(CAST(pm_inner.UserId AS NVARCHAR(50)), ',') 
         FROM ProjectMembers pm_inner WHERE pm_inner.ProjectId = p.Id) as MemberIdsString,
        (SELECT STRING_AGG(u.Name, '|') 
         FROM ProjectMembers pm_inner JOIN AspNetUsers u ON pm_inner.UserId = u.Id WHERE pm_inner.ProjectId = p.Id) as MemberNamesString,
        (SELECT STRING_AGG(ISNULL(u.AvatarUrl, ''), '|') 
         FROM ProjectMembers pm_inner JOIN AspNetUsers u ON pm_inner.UserId = u.Id WHERE pm_inner.ProjectId = p.Id) as MemberAvatarsString
    FROM Projects p
    WHERE (p.CreatorId = @UserId OR EXISTS (SELECT 1 FROM ProjectMembers pm WHERE pm.ProjectId = p.Id AND pm.UserId = @UserId)) 
    AND ISNULL(p.IsDeleted, 0) = 0
    ORDER BY p.CreatedAt DESC;
END
GO

-- 3. sp_GetProjectTasks: Optimized for Board & Task Management
GO
ALTER PROCEDURE [dbo].[sp_GetProjectTasks]
    @ProjectId UNIQUEIDENTIFIER
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
    WHERE t.ProjectId = @ProjectId AND ISNULL(t.IsDeleted, 0) = 0
    ORDER BY c.OrderIndex ASC, t.CreatedAt DESC;
END
GO

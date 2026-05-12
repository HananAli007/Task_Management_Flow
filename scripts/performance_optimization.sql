-- PERFORMANCE OPTIMIZATIONS FOR DASHBOARD
-- 1. Create missing indexes for faster counts and joins
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TaskItems_Dashboard_Optimization' AND object_id = OBJECT_ID('TaskItems'))
    CREATE INDEX IX_TaskItems_Dashboard_Optimization ON TaskItems (ProjectId, IsDeleted, Status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProjectMembers_ProjectId_UserId' AND object_id = OBJECT_ID('ProjectMembers'))
    CREATE INDEX IX_ProjectMembers_ProjectId_UserId ON ProjectMembers (ProjectId, UserId);

GO

-- 2. Optimized sp_GetUserProjects using CTEs to avoid scalar subquery overhead
ALTER PROCEDURE [dbo].[sp_GetUserProjects]
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    -- Get all project IDs the user has access to first to limit work
    DECLARE @AllowedProjects TABLE (ProjectId UNIQUEIDENTIFIER PRIMARY KEY);
    INSERT INTO @AllowedProjects
    SELECT Id FROM Projects WHERE CreatorId = @UserId AND ISNULL(IsDeleted, 0) = 0
    UNION
    SELECT ProjectId FROM ProjectMembers WHERE UserId = @UserId;

    -- Aggregate stats for only the allowed projects
    WITH ProjectStats AS (
        SELECT 
            t.ProjectId,
            COUNT(*) as TotalTasks,
            SUM(CASE WHEN t.Status = '3' OR c.SystemStatus = 3 THEN 1 ELSE 0 END) as CompletedTasks
        FROM TaskItems t
        INNER JOIN @AllowedProjects ap ON t.ProjectId = ap.ProjectId
        LEFT JOIN BoardColumns c ON t.Status = CAST(c.Id AS NVARCHAR(50))
        WHERE ISNULL(t.IsDeleted, 0) = 0
        GROUP BY t.ProjectId
    ),
    ProjectMembersInfo AS (
        SELECT 
            pm.ProjectId,
            STRING_AGG(CAST(pm.UserId AS NVARCHAR(50)), ',') as MemberIdsString,
            STRING_AGG(u.Name, '|') as MemberNamesString,
            STRING_AGG(ISNULL(u.AvatarUrl, ''), '|') as MemberAvatarsString
        FROM ProjectMembers pm
        INNER JOIN @AllowedProjects ap ON pm.ProjectId = ap.ProjectId
        JOIN AspNetUsers u ON pm.UserId = u.Id
        GROUP BY pm.ProjectId
    )
    SELECT 
        p.Id,
        p.Name,
        p.Description,
        p.Status,
        p.Priority,
        p.Deadline,
        p.CreatedAt,
        ISNULL(p.IsDeleted, 0) as IsDeleted,
        ISNULL(ps.TotalTasks, 0) as TotalTasks,
        ISNULL(ps.CompletedTasks, 0) as CompletedTasks,
        CASE 
            WHEN ISNULL(ps.TotalTasks, 0) = 0 THEN 0 
            ELSE CAST(ISNULL(ps.CompletedTasks, 0) AS FLOAT) * 100 / ps.TotalTasks 
        END as Progress,
        mi.MemberIdsString,
        mi.MemberNamesString,
        mi.MemberAvatarsString
    FROM Projects p
    INNER JOIN @AllowedProjects ap ON p.Id = ap.ProjectId
    LEFT JOIN ProjectStats ps ON p.Id = ps.ProjectId
    LEFT JOIN ProjectMembersInfo mi ON p.Id = mi.ProjectId
    WHERE ISNULL(p.IsDeleted, 0) = 0
    ORDER BY p.CreatedAt DESC;
END
GO

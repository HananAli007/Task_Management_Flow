using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Newtonsoft.Json;

namespace ProjectFlow.Application.DTOs.Tasks;

public class CreateTaskFormDto
{
    [Required(ErrorMessage = "Project ID is required.")]
    public Guid ProjectId { get; set; }

    [Required(ErrorMessage = "Title is required.")]
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "todo";
    public string Priority { get; set; } = "medium";
    public Guid? AssigneeId { get; set; }
    public DateTime? Deadline { get; set; }
    public List<string>? TagNames { get; set; }
    public IFormFileCollection? Attachments { get; set; }
}

public class UpdateTaskFormDto
{
    [Required(ErrorMessage = "Project ID is required.")]
    public Guid ProjectId { get; set; }

    [Required(ErrorMessage = "Title is required.")]
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "todo";
    public string Priority { get; set; } = "medium";
    public Guid? AssigneeId { get; set; }
    public DateTime? Deadline { get; set; }
    public List<string>? TagNames { get; set; }
    public IFormFileCollection? NewAttachments { get; set; }
}
public class TaskStatusUpdateDto
{
    [Required]
    [JsonPropertyName("status")]
    public string Status { get; set; } = "todo";
}

public class TaskResponseDto
{
    [JsonPropertyName("id")]
    [JsonProperty("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("project_id")]
    [JsonProperty("project_id")]
    public Guid ProjectId { get; set; }

    [JsonPropertyName("project_name")]
    [JsonProperty("project_name")]
    public string ProjectName { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    [JsonProperty("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    [JsonProperty("description")]
    public string? Description { get; set; }

    [JsonPropertyName("status")]
    [JsonProperty("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("status_name")]
    [JsonProperty("status_name")]
    public string StatusName { get; set; } = string.Empty;

    [JsonPropertyName("system_status")]
    [JsonProperty("system_status")]
    public int? SystemStatus { get; set; }

    [JsonPropertyName("priority")]
    [JsonProperty("priority")]
    public string Priority { get; set; } = string.Empty;

    [JsonPropertyName("assignee_id")]
    [JsonProperty("assignee_id")]
    public Guid? AssigneeId { get; set; }

    [JsonPropertyName("assignee_name")]
    [JsonProperty("assignee_name")]
    public string? AssigneeName { get; set; }

    [JsonPropertyName("assignee_avatar")]
    [JsonProperty("assignee_avatar")]
    public string? AssigneeAvatar { get; set; }

    [JsonPropertyName("creator_id")]
    [JsonProperty("creator_id")]
    public Guid CreatorId { get; set; }

    [JsonPropertyName("created_at")]
    [JsonProperty("created_at")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("deadline")]
    [JsonProperty("deadline")]
    public DateTime? Deadline { get; set; }

    [JsonPropertyName("tags")]
    [JsonProperty("tags")]
    public List<ProjectFlow.Application.DTOs.Tags.TagResponseDto> Tags { get; set; } = new();

    [JsonPropertyName("subtask_count")]
    [JsonProperty("subtask_count")]
    public int SubtaskCount { get; set; }

    [JsonPropertyName("completed_subtask_count")]
    [JsonProperty("completed_subtask_count")]
    public int CompletedSubtaskCount { get; set; }

    [JsonPropertyName("comment_count")]
    [JsonProperty("comment_count")]
    public int CommentCount { get; set; }

    [JsonPropertyName("attachment_count")]
    [JsonProperty("attachment_count")]
    public int AttachmentCount { get; set; }
}

public class TaskDetailResponseDto : TaskResponseDto
{
    [JsonPropertyName("attachments_list")]
    [JsonProperty("attachments_list")]
    public List<AttachmentDto> AttachmentsList { get; set; } = new();
}

public class TaskHistoryResponseDto
{
    [JsonPropertyName("id")]
    [JsonProperty("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("action")]
    [JsonProperty("action")]
    public string Action { get; set; } = string.Empty;

    [JsonPropertyName("details")]
    [JsonProperty("details")]
    public string Details { get; set; } = string.Empty;

    [JsonPropertyName("created_at")]
    [JsonProperty("created_at")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("user_id")]
    [JsonProperty("user_id")]
    public Guid UserId { get; set; }

    [JsonPropertyName("user_name")]
    [JsonProperty("user_name")]
    public string UserName { get; set; } = string.Empty;

    [JsonPropertyName("user_avatar")]
    [JsonProperty("user_avatar")]
    public string? UserAvatar { get; set; }
}


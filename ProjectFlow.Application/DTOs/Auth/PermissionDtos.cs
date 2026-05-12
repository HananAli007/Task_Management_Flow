namespace ProjectFlow.Application.DTOs.Auth;

public class PermissionDto
{
    public string ScreenName { get; set; } = string.Empty;
    public string ObjectName { get; set; } = string.Empty;
    public bool Allowed { get; set; }
}

public class UserPermissionManifestDto
{
    public List<PermissionDto> GlobalPermissions { get; set; } = new();
    public Dictionary<Guid, List<PermissionDto>> ProjectPermissions { get; set; } = new();
}

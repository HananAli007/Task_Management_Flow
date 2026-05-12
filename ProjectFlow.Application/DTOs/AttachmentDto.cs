namespace ProjectFlow.Application.DTOs;

public class AttachmentDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string FileSize { get; set; } = string.Empty;

    public static string FormatFileSize(long bytes)
    {
        string[] suffix = { "B", "KB", "MB", "GB", "TB" };
        int i = 0;
        double dblSByte = bytes;
        while (dblSByte >= 1024 && i < suffix.Length - 1)
        {
            dblSByte /= 1024;
            i++;
        }
        return $"{Math.Round(dblSByte, 2)} {suffix[i]}";
    }
}

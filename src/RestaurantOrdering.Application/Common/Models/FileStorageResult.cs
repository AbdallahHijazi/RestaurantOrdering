namespace RestaurantOrdering.Application.Common.Models;

public sealed class FileStorageResult
{
    public string StoredFileName { get; init; } = string.Empty;
    public string FileUrl { get; init; } = string.Empty;
    public string SanitizedOriginalFileName { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
    public long ActualFileSizeBytes { get; init; }
}

namespace RestaurantOrdering.Application.Features.MediaFiles.DTOs;

public class MediaFileDto
{
    public Guid Id { get; init; }
    public Guid RestaurantId { get; init; }
    public string FileName { get; init; } = string.Empty;
    public string StoredFileName { get; init; } = string.Empty;
    public string OriginalFileName { get; init; } = string.Empty;
    public string FileUrl { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
    public long FileSizeBytes { get; init; }
    public string? EntityType { get; init; }
    public Guid? EntityId { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

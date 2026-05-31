namespace RestaurantOrdering.Application.Common.Models;

public sealed class FileStorageRequest
{
    public Guid RestaurantId { get; init; }
    public string OriginalFileName { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
    public long DeclaredFileSizeBytes { get; init; }
}

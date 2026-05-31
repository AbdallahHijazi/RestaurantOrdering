namespace RestaurantOrdering.Api.Contracts.Admin.MediaFiles;

public sealed class UploadedMediaFileResponse
{
    public Guid Id { get; init; }
    public Guid RestaurantId { get; init; }
    public string FileName { get; init; } = string.Empty;
    public string FileUrl { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
    public long FileSizeBytes { get; init; }
    public DateTime CreatedAt { get; init; }
}

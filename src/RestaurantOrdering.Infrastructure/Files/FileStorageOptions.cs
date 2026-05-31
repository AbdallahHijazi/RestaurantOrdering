namespace RestaurantOrdering.Infrastructure.Files;

public sealed class FileStorageOptions
{
    public const string SectionName = "FileStorage";

    public string RootPath { get; set; } = string.Empty;
    public string PublicBasePath { get; set; } = string.Empty;
    public long MaxFileSizeBytes { get; set; }
    public string[] AllowedContentTypes { get; set; } = [];
    public string[] AllowedExtensions { get; set; } = [];
}

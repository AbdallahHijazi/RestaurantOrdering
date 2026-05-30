using RestaurantOrdering.Domain.Common;

namespace RestaurantOrdering.Domain.Entities;

public class MediaFile : AuditableEntity, ISoftDelete
{
    public Guid RestaurantId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public bool IsDeleted { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
}

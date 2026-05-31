using RestaurantOrdering.Application.Features.MediaFiles.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.MediaFiles.Common;

public static class MediaFileMappings
{
    public static MediaFileDto ToDto(this MediaFile mediaFile) => new()
    {
        Id = mediaFile.Id,
        RestaurantId = mediaFile.RestaurantId,
        FileName = mediaFile.FileName,
        StoredFileName = mediaFile.StoredFileName,
        OriginalFileName = mediaFile.OriginalFileName,
        FileUrl = mediaFile.FileUrl,
        ContentType = mediaFile.ContentType,
        FileSizeBytes = mediaFile.FileSizeBytes,
        EntityType = mediaFile.EntityType,
        EntityId = mediaFile.EntityId,
        CreatedAt = mediaFile.CreatedAt,
        UpdatedAt = mediaFile.UpdatedAt
    };
}

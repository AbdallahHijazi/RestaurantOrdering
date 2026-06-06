using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;

namespace RestaurantOrdering.Application.Features.Restaurants.Common;

public static class RestaurantBrandingMediaResolver
{
    public static async Task<(string? LogoUrl, string? CoverImageUrl)> ResolveUrlsAsync(
        IApplicationDbContext context,
        Guid? logoFileId,
        Guid? coverImageFileId,
        CancellationToken cancellationToken)
    {
        var fileIds = new List<Guid>(2);
        if (logoFileId.HasValue)
        {
            fileIds.Add(logoFileId.Value);
        }

        if (coverImageFileId.HasValue)
        {
            fileIds.Add(coverImageFileId.Value);
        }

        if (fileIds.Count == 0)
        {
            return (null, null);
        }

        var urlsById = await context.MediaFiles
            .AsNoTracking()
            .Where(media => fileIds.Contains(media.Id))
            .ToDictionaryAsync(media => media.Id, media => media.FileUrl, cancellationToken);

        string? Resolve(Guid? fileId) =>
            fileId.HasValue && urlsById.TryGetValue(fileId.Value, out var fileUrl)
                ? fileUrl
                : null;

        return (Resolve(logoFileId), Resolve(coverImageFileId));
    }
}

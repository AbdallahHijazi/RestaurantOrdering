using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.MenuItems.Common;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;

namespace RestaurantOrdering.Application.Features.MenuItems.Queries.GetMenuItems;

public sealed class GetMenuItemsQueryHandler
    : IRequestHandler<GetMenuItemsQuery, IReadOnlyList<MenuItemDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMenuItemsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<MenuItemDto>> Handle(
        GetMenuItemsQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.MenuItems
            .AsNoTracking()
            .Where(item => item.RestaurantId == request.RestaurantId);

        if (request.CategoryId.HasValue)
        {
            query = query.Where(item => item.CategoryId == request.CategoryId.Value);
        }

        var menuItems = await query
            .OrderBy(item => item.DisplayOrder)
            .ThenBy(item => item.NameAr)
            .ToListAsync(cancellationToken);

        if (menuItems.Count == 0)
        {
            return Array.Empty<MenuItemDto>();
        }

        var imageFileIds = menuItems
            .Where(item => item.ImageFileId.HasValue)
            .Select(item => item.ImageFileId!.Value)
            .Distinct()
            .ToList();

        var imageUrlsById = imageFileIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await _context.MediaFiles
                .AsNoTracking()
                .Where(media => imageFileIds.Contains(media.Id))
                .ToDictionaryAsync(media => media.Id, media => media.FileUrl, cancellationToken);

        var translations = await LegacyBilingualTranslationLoader.LoadMenuItemsAsync(
            _context,
            menuItems.Select(item => item.Id).ToList(),
            cancellationToken);

        return menuItems
            .Select(item =>
            {
                string? imageUrl = item.ImageFileId.HasValue &&
                                   imageUrlsById.TryGetValue(item.ImageFileId.Value, out var url)
                    ? url
                    : null;

                return item.ToDto(
                    imageUrl,
                    LegacyBilingualTranslationLoader.GetMenuItemTranslation(translations, item.Id, "ar"),
                    LegacyBilingualTranslationLoader.GetMenuItemTranslation(translations, item.Id, "en"));
            })
            .ToList()
            .AsReadOnly();
    }
}

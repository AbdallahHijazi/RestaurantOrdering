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
    private readonly IPublicLocaleResolver _publicLocaleResolver;

    public GetMenuItemsQueryHandler(
        IApplicationDbContext context,
        IPublicLocaleResolver publicLocaleResolver)
    {
        _context = context;
        _publicLocaleResolver = publicLocaleResolver;
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

        var settings = await _context.RestaurantSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RestaurantId == request.RestaurantId, cancellationToken);

        var localeContext = await PublicLocaleContextLoader.LoadAsync(
            _context,
            request.RestaurantId,
            settings?.DefaultLocale,
            cancellationToken);

        var menuLocale = _publicLocaleResolver.ResolveMenuLocale(
            requestedLang: null,
            localeContext.DefaultLocale,
            localeContext.SupportedLocales,
            localeContext.LocaleDefinitions);

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

        var menuItemIds = menuItems.Select(item => item.Id).ToList();

        var legacyTranslations = await LegacyBilingualTranslationLoader.LoadMenuItemsAsync(
            _context,
            menuItemIds,
            cancellationToken);

        var primaryTranslations = await PublicMenuTranslationLoader.LoadMenuItemsAsync(
            _context,
            menuItemIds,
            cancellationToken);

        return menuItems
            .Select(item =>
            {
                string? imageUrl = item.ImageFileId.HasValue &&
                                   imageUrlsById.TryGetValue(item.ImageFileId.Value, out var url)
                    ? url
                    : null;

                var primaryContent = _publicLocaleResolver.ResolveAdminCatalogPrimaryContent(
                    menuLocale,
                    localeContext.DefaultLocale,
                    localeContext.SupportedLocales,
                    localeContext.LocaleDefinitions,
                    PublicMenuTranslationLoader.GetMenuItemTranslations(primaryTranslations, item.Id),
                    item.ContentVersion,
                    item.NameAr,
                    item.NameEn,
                    item.DescriptionAr,
                    item.DescriptionEn);

                return item.ToDto(
                    imageUrl,
                    LegacyBilingualTranslationLoader.GetMenuItemTranslation(legacyTranslations, item.Id, "ar"),
                    LegacyBilingualTranslationLoader.GetMenuItemTranslation(legacyTranslations, item.Id, "en"),
                    primaryContent: primaryContent);
            })
            .ToList()
            .AsReadOnly();
    }
}

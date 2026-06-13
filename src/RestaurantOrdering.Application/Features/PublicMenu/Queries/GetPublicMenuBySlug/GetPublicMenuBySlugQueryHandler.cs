using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.PublicMenu.Common;
using RestaurantOrdering.Application.Features.PublicMenu.DTOs;
using RestaurantOrdering.Application.Features.Restaurants.Common;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.PublicMenu.Queries.GetPublicMenuBySlug;

public sealed class GetPublicMenuBySlugQueryHandler
    : IRequestHandler<GetPublicMenuBySlugQuery, PublicMenuDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IPublicLocaleResolver _publicLocaleResolver;

    public GetPublicMenuBySlugQueryHandler(
        IApplicationDbContext context,
        IPublicLocaleResolver publicLocaleResolver)
    {
        _context = context;
        _publicLocaleResolver = publicLocaleResolver;
    }

    public async Task<PublicMenuDto> Handle(
        GetPublicMenuBySlugQuery request,
        CancellationToken cancellationToken)
    {
        var normalizedSlug = SlugNormalizer.Normalize(request.RestaurantSlug);

        var restaurant = await _context.Restaurants
            .AsNoTracking()
            .FirstOrDefaultAsync(
                r => r.Slug == normalizedSlug && r.IsActive,
                cancellationToken);

        if (restaurant is null)
        {
            throw new NotFoundException("Restaurant", normalizedSlug);
        }

        var settings = await _context.RestaurantSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RestaurantId == restaurant.Id, cancellationToken);

        var localeContext = await PublicLocaleContextLoader.LoadAsync(
            _context,
            restaurant.Id,
            settings?.DefaultLocale,
            cancellationToken);

        var defaultLocale = localeContext.DefaultLocale;
        var supportedLocales = localeContext.SupportedLocales;
        var localeDefinitions = localeContext.LocaleDefinitions;

        var menuLocale = _publicLocaleResolver.ResolveMenuLocale(
            request.Lang,
            defaultLocale,
            supportedLocales,
            localeDefinitions);

        var legacyRestaurantTranslations = await LegacyBilingualTranslationLoader.LoadRestaurantAsync(
            _context,
            restaurant.Id,
            cancellationToken);

        legacyRestaurantTranslations.TryGetValue("ar", out var restaurantArTranslation);
        legacyRestaurantTranslations.TryGetValue("en", out var restaurantEnTranslation);

        var restaurantTranslations = await PublicMenuTranslationLoader.LoadRestaurantAsync(
            _context,
            restaurant.Id,
            cancellationToken);

        var localizedRestaurant = _publicLocaleResolver.ResolveRestaurantContent(
            menuLocale,
            defaultLocale,
            supportedLocales,
            localeDefinitions,
            restaurantTranslations,
            restaurant.ContentVersion,
            restaurant.NameAr,
            restaurant.NameEn,
            restaurant.DescriptionAr,
            restaurant.DescriptionEn,
            restaurant.AddressAr,
            restaurant.AddressEn);

        var categories = await _context.Categories
            .AsNoTracking()
            .Where(c => c.RestaurantId == restaurant.Id && c.IsActive)
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.NameAr)
            .ToListAsync(cancellationToken);

        var activeCategoryIds = categories.Select(c => c.Id).ToHashSet();

        var menuItems = await _context.MenuItems
            .AsNoTracking()
            .Where(item =>
                item.RestaurantId == restaurant.Id &&
                item.IsActive &&
                item.IsAvailable &&
                activeCategoryIds.Contains(item.CategoryId))
            .OrderBy(item => item.DisplayOrder)
            .ThenBy(item => item.NameAr)
            .ToListAsync(cancellationToken);

        var legacyCategoryTranslations = await LegacyBilingualTranslationLoader.LoadCategoriesAsync(
            _context,
            categories.Select(c => c.Id).ToList(),
            cancellationToken);

        var legacyMenuItemTranslations = await LegacyBilingualTranslationLoader.LoadMenuItemsAsync(
            _context,
            menuItems.Select(item => item.Id).ToList(),
            cancellationToken);

        var categoryTranslations = await PublicMenuTranslationLoader.LoadCategoriesAsync(
            _context,
            categories.Select(c => c.Id).ToList(),
            cancellationToken);

        var menuItemTranslations = await PublicMenuTranslationLoader.LoadMenuItemsAsync(
            _context,
            menuItems.Select(item => item.Id).ToList(),
            cancellationToken);

        var imageFileIds = menuItems
            .Where(item => item.ImageFileId.HasValue)
            .Select(item => item.ImageFileId!.Value)
            .ToList();

        if (restaurant.LogoFileId.HasValue)
        {
            imageFileIds.Add(restaurant.LogoFileId.Value);
        }

        if (restaurant.CoverImageFileId.HasValue)
        {
            imageFileIds.Add(restaurant.CoverImageFileId.Value);
        }

        var imageUrlsById = imageFileIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await _context.MediaFiles
                .AsNoTracking()
                .Where(media => imageFileIds.Distinct().Contains(media.Id))
                .ToDictionaryAsync(media => media.Id, media => media.FileUrl, cancellationToken);

        string? ResolveMediaUrl(Guid? fileId) =>
            fileId.HasValue && imageUrlsById.TryGetValue(fileId.Value, out var fileUrl)
                ? fileUrl
                : null;

        string? ResolveImageUrl(MenuItem item)
        {
            if (!item.ImageFileId.HasValue)
            {
                return null;
            }

            return imageUrlsById.TryGetValue(item.ImageFileId.Value, out var fileUrl)
                ? fileUrl
                : null;
        }

        var itemsByCategoryId = menuItems
            .GroupBy(item => item.CategoryId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<PublicMenuItemDto>)group
                    .Select(item =>
                    {
                        var localizedItem = _publicLocaleResolver.ResolveMenuItemContent(
                            menuLocale,
                            defaultLocale,
                            supportedLocales,
                            localeDefinitions,
                            PublicMenuTranslationLoader.GetMenuItemTranslations(menuItemTranslations, item.Id),
                            item.ContentVersion,
                            item.NameAr,
                            item.NameEn,
                            item.DescriptionAr,
                            item.DescriptionEn);

                        return item.ToPublicMenuItemDto(
                            ResolveImageUrl(item),
                            LegacyBilingualTranslationLoader.GetMenuItemTranslation(
                                legacyMenuItemTranslations,
                                item.Id,
                                "ar"),
                            LegacyBilingualTranslationLoader.GetMenuItemTranslation(
                                legacyMenuItemTranslations,
                                item.Id,
                                "en"),
                            localizedItem);
                    })
                    .ToList()
                    .AsReadOnly());

        var categoryDtos = categories
            .Select(category =>
            {
                itemsByCategoryId.TryGetValue(category.Id, out var items);
                var localizedCategory = _publicLocaleResolver.ResolveCategoryContent(
                    menuLocale,
                    defaultLocale,
                    supportedLocales,
                    localeDefinitions,
                    PublicMenuTranslationLoader.GetCategoryTranslations(categoryTranslations, category.Id),
                    category.ContentVersion,
                    category.NameAr,
                    category.NameEn,
                    category.DescriptionAr,
                    category.DescriptionEn);

                return category.ToPublicMenuCategoryDto(
                    items ?? Array.Empty<PublicMenuItemDto>(),
                    LegacyBilingualTranslationLoader.GetCategoryTranslation(
                        legacyCategoryTranslations,
                        category.Id,
                        "ar"),
                    LegacyBilingualTranslationLoader.GetCategoryTranslation(
                        legacyCategoryTranslations,
                        category.Id,
                        "en"),
                    localizedCategory);
            })
            .ToList()
            .AsReadOnly();

        return new PublicMenuDto
        {
            Id = restaurant.Id,
            Slug = restaurant.Slug,
            NameAr = PublishedTranslationDualRead.ResolveRequired(
                restaurantArTranslation?.Name,
                restaurantArTranslation?.PublishedSourceVersion,
                restaurant.ContentVersion,
                restaurant.NameAr),
            NameEn = PublishedTranslationDualRead.ResolveOptional(
                restaurantEnTranslation?.Name,
                restaurantEnTranslation?.PublishedSourceVersion,
                restaurant.ContentVersion,
                restaurant.NameEn),
            DescriptionAr = PublishedTranslationDualRead.ResolveOptional(
                restaurantArTranslation?.Description,
                restaurantArTranslation?.PublishedSourceVersion,
                restaurant.ContentVersion,
                restaurant.DescriptionAr),
            DescriptionEn = PublishedTranslationDualRead.ResolveOptional(
                restaurantEnTranslation?.Description,
                restaurantEnTranslation?.PublishedSourceVersion,
                restaurant.ContentVersion,
                restaurant.DescriptionEn),
            LogoFileId = restaurant.LogoFileId,
            LogoUrl = ResolveMediaUrl(restaurant.LogoFileId),
            CoverImageUrl = ResolveMediaUrl(restaurant.CoverImageFileId),
            AccentColor = restaurant.AccentColor,
            PhoneNumber = restaurant.PhoneNumber,
            WhatsAppNumber = restaurant.WhatsAppNumber,
            AddressAr = PublishedTranslationDualRead.ResolveOptional(
                restaurantArTranslation?.Address,
                restaurantArTranslation?.PublishedSourceVersion,
                restaurant.ContentVersion,
                restaurant.AddressAr),
            AddressEn = PublishedTranslationDualRead.ResolveOptional(
                restaurantEnTranslation?.Address,
                restaurantEnTranslation?.PublishedSourceVersion,
                restaurant.ContentVersion,
                restaurant.AddressEn),
            Latitude = restaurant.Latitude,
            Longitude = restaurant.Longitude,
            CurrencyCode = settings?.CurrencyCode,
            TaxRate = settings?.TaxRate,
            DeliveryFee = settings?.DeliveryFee,
            MinimumOrderAmount = settings?.MinimumOrderAmount,
            IsDeliveryEnabled = settings?.IsDeliveryEnabled,
            IsPickupEnabled = settings?.IsPickupEnabled,
            RequestedLocale = menuLocale.RequestedLocale,
            ResolvedLocale = menuLocale.ResolvedLocale,
            FallbackApplied = menuLocale.FallbackApplied,
            Direction = menuLocale.Direction,
            Name = localizedRestaurant.Name,
            Description = localizedRestaurant.Description,
            Address = localizedRestaurant.Address,
            Categories = categoryDtos
        };
    }
}

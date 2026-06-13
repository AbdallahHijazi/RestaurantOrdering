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

    public GetPublicMenuBySlugQueryHandler(IApplicationDbContext context)
    {
        _context = context;
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

        var restaurantTranslations = await LegacyBilingualTranslationLoader.LoadRestaurantAsync(
            _context,
            restaurant.Id,
            cancellationToken);

        restaurantTranslations.TryGetValue("ar", out var restaurantArTranslation);
        restaurantTranslations.TryGetValue("en", out var restaurantEnTranslation);

        var settings = await _context.RestaurantSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RestaurantId == restaurant.Id, cancellationToken);

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

        var categoryTranslations = await LegacyBilingualTranslationLoader.LoadCategoriesAsync(
            _context,
            categories.Select(c => c.Id).ToList(),
            cancellationToken);

        var menuItemTranslations = await LegacyBilingualTranslationLoader.LoadMenuItemsAsync(
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
                    .Select(item => item.ToPublicMenuItemDto(
                        ResolveImageUrl(item),
                        LegacyBilingualTranslationLoader.GetMenuItemTranslation(menuItemTranslations, item.Id, "ar"),
                        LegacyBilingualTranslationLoader.GetMenuItemTranslation(menuItemTranslations, item.Id, "en")))
                    .ToList()
                    .AsReadOnly());

        var categoryDtos = categories
            .Select(category =>
            {
                itemsByCategoryId.TryGetValue(category.Id, out var items);
                return category.ToPublicMenuCategoryDto(
                    items ?? Array.Empty<PublicMenuItemDto>(),
                    LegacyBilingualTranslationLoader.GetCategoryTranslation(categoryTranslations, category.Id, "ar"),
                    LegacyBilingualTranslationLoader.GetCategoryTranslation(categoryTranslations, category.Id, "en"));
            })
            .ToList()
            .AsReadOnly();

        return new PublicMenuDto
        {
            Id = restaurant.Id,
            Slug = restaurant.Slug,
            NameAr = PublishedTranslationDualRead.ResolveRequired(
                restaurantArTranslation?.Name, restaurantArTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.NameAr),
            NameEn = PublishedTranslationDualRead.ResolveOptional(
                restaurantEnTranslation?.Name, restaurantEnTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.NameEn),
            DescriptionAr = PublishedTranslationDualRead.ResolveOptional(
                restaurantArTranslation?.Description, restaurantArTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.DescriptionAr),
            DescriptionEn = PublishedTranslationDualRead.ResolveOptional(
                restaurantEnTranslation?.Description, restaurantEnTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.DescriptionEn),
            LogoFileId = restaurant.LogoFileId,
            LogoUrl = ResolveMediaUrl(restaurant.LogoFileId),
            CoverImageUrl = ResolveMediaUrl(restaurant.CoverImageFileId),
            AccentColor = restaurant.AccentColor,
            PhoneNumber = restaurant.PhoneNumber,
            WhatsAppNumber = restaurant.WhatsAppNumber,
            AddressAr = PublishedTranslationDualRead.ResolveOptional(
                restaurantArTranslation?.Address, restaurantArTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.AddressAr),
            AddressEn = PublishedTranslationDualRead.ResolveOptional(
                restaurantEnTranslation?.Address, restaurantEnTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.AddressEn),
            Latitude = restaurant.Latitude,
            Longitude = restaurant.Longitude,
            CurrencyCode = settings?.CurrencyCode,
            TaxRate = settings?.TaxRate,
            DeliveryFee = settings?.DeliveryFee,
            MinimumOrderAmount = settings?.MinimumOrderAmount,
            IsDeliveryEnabled = settings?.IsDeliveryEnabled,
            IsPickupEnabled = settings?.IsPickupEnabled,
            Categories = categoryDtos
        };
    }
}

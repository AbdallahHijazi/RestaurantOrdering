using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.PublicMenu.Common;
using RestaurantOrdering.Application.Features.PublicMenu.DTOs;
using RestaurantOrdering.Application.Features.Restaurants.Common;

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

        var itemsByCategoryId = menuItems
            .GroupBy(item => item.CategoryId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<PublicMenuItemDto>)group
                    .Select(item => item.ToPublicMenuItemDto())
                    .ToList()
                    .AsReadOnly());

        var categoryDtos = categories
            .Select(category =>
            {
                itemsByCategoryId.TryGetValue(category.Id, out var items);
                return category.ToPublicMenuCategoryDto(items ?? Array.Empty<PublicMenuItemDto>());
            })
            .ToList()
            .AsReadOnly();

        return new PublicMenuDto
        {
            Id = restaurant.Id,
            Slug = restaurant.Slug,
            NameAr = restaurant.NameAr,
            NameEn = restaurant.NameEn,
            DescriptionAr = restaurant.DescriptionAr,
            DescriptionEn = restaurant.DescriptionEn,
            LogoFileId = restaurant.LogoFileId,
            PhoneNumber = restaurant.PhoneNumber,
            WhatsAppNumber = restaurant.WhatsAppNumber,
            AddressAr = restaurant.AddressAr,
            AddressEn = restaurant.AddressEn,
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

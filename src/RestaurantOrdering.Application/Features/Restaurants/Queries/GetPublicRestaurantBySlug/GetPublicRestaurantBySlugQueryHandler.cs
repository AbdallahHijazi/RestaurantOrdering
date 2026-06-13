using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.Restaurants.Common;
using RestaurantOrdering.Application.Features.Restaurants.DTOs;

namespace RestaurantOrdering.Application.Features.Restaurants.Queries.GetPublicRestaurantBySlug;

public sealed class GetPublicRestaurantBySlugQueryHandler
    : IRequestHandler<GetPublicRestaurantBySlugQuery, PublicRestaurantDto>
{
    private readonly IApplicationDbContext _context;

    public GetPublicRestaurantBySlugQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PublicRestaurantDto> Handle(
        GetPublicRestaurantBySlugQuery request,
        CancellationToken cancellationToken)
    {
        var normalizedSlug = SlugNormalizer.Normalize(request.Slug);

        var restaurant = await _context.Restaurants
            .AsNoTracking()
            .FirstOrDefaultAsync(
                r => r.Slug == normalizedSlug && r.IsActive,
                cancellationToken);

        if (restaurant is null)
        {
            throw new NotFoundException("Restaurant", normalizedSlug);
        }

        var translations = await LegacyBilingualTranslationLoader.LoadRestaurantAsync(
            _context,
            restaurant.Id,
            cancellationToken);

        translations.TryGetValue("ar", out var arTranslation);
        translations.TryGetValue("en", out var enTranslation);

        return restaurant.ToPublicDto(
            arTranslation: arTranslation,
            enTranslation: enTranslation);
    }
}

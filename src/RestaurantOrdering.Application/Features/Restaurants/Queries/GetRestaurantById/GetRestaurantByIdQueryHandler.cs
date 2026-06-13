using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.Restaurants.Common;
using RestaurantOrdering.Application.Features.Restaurants.DTOs;

namespace RestaurantOrdering.Application.Features.Restaurants.Queries.GetRestaurantById;

public sealed class GetRestaurantByIdQueryHandler
    : IRequestHandler<GetRestaurantByIdQuery, RestaurantDto>
{
    private readonly IApplicationDbContext _context;

    public GetRestaurantByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RestaurantDto> Handle(
        GetRestaurantByIdQuery request,
        CancellationToken cancellationToken)
    {
        var restaurant = await _context.Restaurants
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == request.RestaurantId, cancellationToken);

        if (restaurant is null)
        {
            throw new NotFoundException("Restaurant", request.RestaurantId);
        }

        var (logoUrl, coverImageUrl) = await RestaurantBrandingMediaResolver.ResolveUrlsAsync(
            _context,
            restaurant.LogoFileId,
            restaurant.CoverImageFileId,
            cancellationToken);

        var translations = await LegacyBilingualTranslationLoader.LoadRestaurantAsync(
            _context,
            restaurant.Id,
            cancellationToken);

        translations.TryGetValue("ar", out var arTranslation);
        translations.TryGetValue("en", out var enTranslation);

        return restaurant.ToDto(
            logoUrl,
            coverImageUrl,
            arTranslation,
            enTranslation);
    }
}

using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.Restaurants.Common;
using RestaurantOrdering.Application.Features.Restaurants.DTOs;

namespace RestaurantOrdering.Application.Features.MediaFiles.Commands.SetRestaurantLogo;

public sealed class SetRestaurantLogoCommandHandler
    : IRequestHandler<SetRestaurantLogoCommand, RestaurantDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public SetRestaurantLogoCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<RestaurantDto> Handle(
        SetRestaurantLogoCommand request,
        CancellationToken cancellationToken)
    {
        var restaurant = await _context.Restaurants
            .FirstOrDefaultAsync(r => r.Id == request.RestaurantId, cancellationToken);

        if (restaurant is null)
        {
            throw new NotFoundException("Restaurant", request.RestaurantId);
        }

        var mediaFileExists = await _context.MediaFiles
            .AsNoTracking()
            .AnyAsync(
                m => m.Id == request.MediaFileId && m.RestaurantId == request.RestaurantId,
                cancellationToken);

        if (!mediaFileExists)
        {
            throw new NotFoundException("MediaFile", request.MediaFileId);
        }

        restaurant.LogoFileId = request.MediaFileId;
        restaurant.UpdatedAt = _dateTimeService.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        var (logoUrl, coverImageUrl) = await RestaurantBrandingMediaResolver.ResolveUrlsAsync(
            _context,
            restaurant.LogoFileId,
            restaurant.CoverImageFileId,
            cancellationToken);

        return restaurant.ToDto(logoUrl, coverImageUrl);
    }
}

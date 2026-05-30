using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.Restaurants.Common;
using RestaurantOrdering.Application.Features.Restaurants.DTOs;

namespace RestaurantOrdering.Application.Features.Restaurants.Commands.UpdateRestaurant;

public sealed class UpdateRestaurantCommandHandler
    : IRequestHandler<UpdateRestaurantCommand, RestaurantDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public UpdateRestaurantCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<RestaurantDto> Handle(
        UpdateRestaurantCommand request,
        CancellationToken cancellationToken)
    {
        var normalizedSlug = SlugNormalizer.Normalize(request.Slug);

        var restaurant = await _context.Restaurants
            .FirstOrDefaultAsync(r => r.Id == request.RestaurantId, cancellationToken);

        if (restaurant is null)
        {
            throw new NotFoundException("Restaurant", request.RestaurantId);
        }

        var slugInUse = await _context.Restaurants
            .AnyAsync(
                r => r.Slug == normalizedSlug && r.Id != request.RestaurantId,
                cancellationToken);

        if (slugInUse)
        {
            throw new ConflictException("Restaurant slug is already in use.");
        }

        restaurant.Slug = normalizedSlug;
        restaurant.NameAr = request.NameAr;
        restaurant.NameEn = request.NameEn;
        restaurant.DescriptionAr = request.DescriptionAr;
        restaurant.DescriptionEn = request.DescriptionEn;
        restaurant.PhoneNumber = request.PhoneNumber;
        restaurant.WhatsAppNumber = request.WhatsAppNumber;
        restaurant.AddressAr = request.AddressAr;
        restaurant.AddressEn = request.AddressEn;
        restaurant.Latitude = request.Latitude;
        restaurant.Longitude = request.Longitude;
        restaurant.UpdatedAt = _dateTimeService.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return restaurant.ToDto();
    }
}

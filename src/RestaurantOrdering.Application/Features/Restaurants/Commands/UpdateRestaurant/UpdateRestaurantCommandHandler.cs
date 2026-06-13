using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.Restaurants.Common;
using RestaurantOrdering.Application.Features.Restaurants.DTOs;

namespace RestaurantOrdering.Application.Features.Restaurants.Commands.UpdateRestaurant;

public sealed class UpdateRestaurantCommandHandler
    : IRequestHandler<UpdateRestaurantCommand, RestaurantDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;
    private readonly IPublishedTranslationWriter _publishedTranslationWriter;

    public UpdateRestaurantCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService,
        IPublishedTranslationWriter publishedTranslationWriter)
    {
        _context = context;
        _dateTimeService = dateTimeService;
        _publishedTranslationWriter = publishedTranslationWriter;
    }

    public async Task<RestaurantDto> Handle(
        UpdateRestaurantCommand request,
        CancellationToken cancellationToken)
    {
        await _publishedTranslationWriter.EnsureLegacyBilingualWriteSupportedAsync(
            request.RestaurantId,
            cancellationToken);

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

        var nameAr = request.NameAr.Trim();
        var nameEn = request.NameEn?.Trim();
        var descriptionAr = request.DescriptionAr?.Trim();
        var descriptionEn = request.DescriptionEn?.Trim();
        var addressAr = request.AddressAr?.Trim();
        var addressEn = request.AddressEn?.Trim();
        var contentVersionBefore = restaurant.ContentVersion;

        TranslatableContentVersion.BumpRestaurantIfTranslatableContentChanged(
            restaurant,
            nameAr,
            nameEn,
            descriptionAr,
            descriptionEn,
            addressAr,
            addressEn);

        restaurant.Slug = normalizedSlug;
        restaurant.NameAr = nameAr;
        restaurant.NameEn = nameEn;
        restaurant.DescriptionAr = descriptionAr;
        restaurant.DescriptionEn = descriptionEn;
        restaurant.PhoneNumber = request.PhoneNumber;
        restaurant.WhatsAppNumber = request.WhatsAppNumber;
        restaurant.AddressAr = addressAr;
        restaurant.AddressEn = addressEn;
        restaurant.Latitude = request.Latitude;
        restaurant.Longitude = request.Longitude;
        restaurant.AccentColor = RestaurantAccentColor.Normalize(request.AccentColor);
        restaurant.UpdatedAt = _dateTimeService.UtcNow;

        if (restaurant.ContentVersion > contentVersionBefore)
        {
            await _publishedTranslationWriter.UpsertRestaurantPublishedTranslationsAsync(
                restaurant,
                isManualEdit: true,
                cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

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

        return restaurant.ToDto(logoUrl, coverImageUrl, arTranslation, enTranslation);
    }
}

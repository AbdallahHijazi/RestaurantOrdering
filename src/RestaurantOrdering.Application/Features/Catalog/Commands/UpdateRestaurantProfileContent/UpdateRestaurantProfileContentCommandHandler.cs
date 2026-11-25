using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Restaurants.Common;
using RestaurantOrdering.Application.Features.Restaurants.DTOs;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Catalog.Commands.UpdateRestaurantProfileContent;

public sealed class UpdateRestaurantProfileContentCommandHandler
    : IRequestHandler<UpdateRestaurantProfileContentCommand, RestaurantDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IRestaurantPermissionService _permissionService;
    private readonly IDateTimeService _dateTimeService;
    private readonly IPublishedTranslationWriter _publishedTranslationWriter;
    private readonly ITranslationJobEnqueuer _translationJobEnqueuer;

    public UpdateRestaurantProfileContentCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IRestaurantPermissionService permissionService,
        IDateTimeService dateTimeService,
        IPublishedTranslationWriter publishedTranslationWriter,
        ITranslationJobEnqueuer translationJobEnqueuer)
    {
        _context = context;
        _currentUserService = currentUserService;
        _permissionService = permissionService;
        _dateTimeService = dateTimeService;
        _publishedTranslationWriter = publishedTranslationWriter;
        _translationJobEnqueuer = translationJobEnqueuer;
    }

    public async Task<RestaurantDto> Handle(
        UpdateRestaurantProfileContentCommand request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedAccessException("Authentication is required.");

        await _permissionService.EnsurePermissionAsync(
            userId,
            request.RestaurantId,
            RestaurantPermission.RestaurantSettingsUpdateGeneral,
            cancellationToken);

        var restaurant = await _context.Restaurants
            .FirstOrDefaultAsync(r => r.Id == request.RestaurantId, cancellationToken);

        if (restaurant is null)
        {
            throw new NotFoundException("Restaurant", request.RestaurantId);
        }

        var defaultLocale = await _publishedTranslationWriter.GetRestaurantDefaultLocaleAsync(
            request.RestaurantId,
            cancellationToken);

        var name = request.Name.Trim();
        var description = request.Description?.Trim();
        var address = request.Address?.Trim();
        var (currentName, currentDescription, currentAddress) = await PrimaryLocaleContentVersion.GetRestaurantContentAsync(
            _context,
            restaurant,
            defaultLocale,
            cancellationToken);

        var contentChanged = PrimaryLocaleContentVersion.BumpRestaurantIfPrimaryContentChanged(
            restaurant,
            currentName,
            currentDescription,
            currentAddress,
            name,
            description,
            address);

        PrimaryLocaleLegacySync.ApplyRestaurant(restaurant, defaultLocale, name, description, address);
        restaurant.UpdatedAt = _dateTimeService.UtcNow;

        if (contentChanged)
        {
            await _publishedTranslationWriter.UpsertRestaurantPrimaryLocaleTranslationAsync(
                restaurant,
                defaultLocale,
                name,
                description,
                address,
                isManualEdit: true,
                cancellationToken);

            await _translationJobEnqueuer.EnqueueForEntityAsync(
                request.RestaurantId,
                TranslatableEntityType.Restaurant,
                restaurant.Id,
                restaurant.ContentVersion,
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

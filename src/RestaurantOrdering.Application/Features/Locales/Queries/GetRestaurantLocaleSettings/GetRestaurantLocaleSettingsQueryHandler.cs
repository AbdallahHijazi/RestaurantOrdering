using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Locales.Common;
using RestaurantOrdering.Application.Features.Locales.DTOs;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Locales.Queries.GetRestaurantLocaleSettings;

public sealed class GetRestaurantLocaleSettingsQueryHandler
    : IRequestHandler<GetRestaurantLocaleSettingsQuery, RestaurantLocaleSettingsDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IRestaurantPermissionService _permissionService;

    public GetRestaurantLocaleSettingsQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IRestaurantPermissionService permissionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _permissionService = permissionService;
    }

    public async Task<RestaurantLocaleSettingsDto> Handle(
        GetRestaurantLocaleSettingsQuery request,
        CancellationToken cancellationToken)
    {
        await EnsureRestaurantExistsAsync(request.RestaurantId, cancellationToken);

        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedAccessException("Authentication is required.");

        var canManage = await _permissionService.HasPermissionAsync(
            userId,
            request.RestaurantId,
            RestaurantPermission.RestaurantSettingsManageLocales,
            cancellationToken);

        if (!canManage)
        {
            await _permissionService.EnsurePermissionAsync(
                userId,
                request.RestaurantId,
                RestaurantPermission.RestaurantSettingsView,
                cancellationToken);
        }

        var settings = await _context.RestaurantSettings
            .AsNoTracking()
            .SingleAsync(item => item.RestaurantId == request.RestaurantId, cancellationToken);

        var supportedLocales = await _context.RestaurantSupportedLocales
            .AsNoTracking()
            .Where(item => item.RestaurantId == request.RestaurantId)
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.LocaleCode)
            .ToListAsync(cancellationToken);

        var availableLocales = await _context.LocaleDefinitions
            .AsNoTracking()
            .Where(locale => locale.IsEnabled)
            .OrderBy(locale => locale.SortOrder)
            .ThenBy(locale => locale.Code)
            .ToListAsync(cancellationToken);

        return new RestaurantLocaleSettingsDto
        {
            DefaultLocale = settings.DefaultLocale,
            TranslationMode = TranslationModeParser.ToApiValue(settings.TranslationMode),
            SupportedLocales = supportedLocales.Select(item => item.ToSupportedDto()).ToList(),
            AvailableLocales = availableLocales.Select(item => item.ToSystemDto()).ToList(),
            CanManageLocales = canManage
        };
    }

    private async Task EnsureRestaurantExistsAsync(Guid restaurantId, CancellationToken cancellationToken)
    {
        var exists = await _context.Restaurants
            .AsNoTracking()
            .AnyAsync(restaurant => restaurant.Id == restaurantId && !restaurant.IsDeleted, cancellationToken);

        if (!exists)
        {
            throw new NotFoundException("Restaurant", restaurantId);
        }
    }
}

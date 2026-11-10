using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Locales.DTOs;

namespace RestaurantOrdering.Application.Features.Locales.Commands.UpdateRestaurantLocaleSettings;

public sealed record UpdateRestaurantLocaleSettingsCommand(
    Guid RestaurantId,
    string DefaultLocale,
    IReadOnlyList<UpdateRestaurantSupportedLocaleDto> SupportedLocales,
    string TranslationMode) : IRequest<RestaurantLocaleSettingsDto>, IRestaurantDashboardScopedRequest;

public sealed record UpdateRestaurantSupportedLocaleDto(
    string Code,
    bool IsEnabled,
    int SortOrder);

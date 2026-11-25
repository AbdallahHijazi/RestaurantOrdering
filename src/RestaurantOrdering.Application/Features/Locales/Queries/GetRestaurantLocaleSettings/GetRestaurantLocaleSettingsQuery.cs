using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Locales.DTOs;

namespace RestaurantOrdering.Application.Features.Locales.Queries.GetRestaurantLocaleSettings;

public sealed record GetRestaurantLocaleSettingsQuery(Guid RestaurantId)
    : IRequest<RestaurantLocaleSettingsDto>, IRestaurantDashboardScopedRequest;

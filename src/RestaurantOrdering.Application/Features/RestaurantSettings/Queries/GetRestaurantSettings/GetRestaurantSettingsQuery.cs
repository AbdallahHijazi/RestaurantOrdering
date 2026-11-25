using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.RestaurantSettings.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantSettings.Queries.GetRestaurantSettings;

public sealed record GetRestaurantSettingsQuery(Guid RestaurantId)
    : IRequest<RestaurantSettingsDto>, IRestaurantScopedRequest;

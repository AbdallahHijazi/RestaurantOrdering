using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Restaurants.DTOs;

namespace RestaurantOrdering.Application.Features.Catalog.Commands.UpdateRestaurantProfileContent;

public sealed record UpdateRestaurantProfileContentCommand(
    Guid RestaurantId,
    string Name,
    string? Description,
    string? Address)
    : IRequest<RestaurantDto>, IRestaurantDashboardScopedRequest;

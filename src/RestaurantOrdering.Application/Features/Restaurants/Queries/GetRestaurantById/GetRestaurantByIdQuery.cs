using MediatR;
using RestaurantOrdering.Application.Features.Restaurants.DTOs;

namespace RestaurantOrdering.Application.Features.Restaurants.Queries.GetRestaurantById;

public sealed record GetRestaurantByIdQuery(Guid RestaurantId) : IRequest<RestaurantDto>;

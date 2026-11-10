using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.RestaurantTables.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Commands.RegenerateRestaurantTableToken;

public sealed record RegenerateRestaurantTableTokenCommand(
    Guid RestaurantId,
    Guid TableId) : IRequest<RestaurantTableDto>, IRestaurantScopedRequest;

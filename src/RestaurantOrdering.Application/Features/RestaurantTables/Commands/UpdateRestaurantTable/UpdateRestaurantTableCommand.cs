using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.RestaurantTables.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Commands.UpdateRestaurantTable;

public sealed record UpdateRestaurantTableCommand(
    Guid RestaurantId,
    Guid TableId,
    string Name,
    string? Zone) : IRequest<RestaurantTableDto>, IRestaurantScopedRequest;

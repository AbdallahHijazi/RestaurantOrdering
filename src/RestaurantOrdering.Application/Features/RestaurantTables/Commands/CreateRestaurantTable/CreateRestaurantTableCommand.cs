using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.RestaurantTables.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Commands.CreateRestaurantTable;

public sealed record CreateRestaurantTableCommand(
    Guid RestaurantId,
    string Name,
    string? Zone,
    bool IsActive) : IRequest<RestaurantTableDto>, IRestaurantScopedRequest;

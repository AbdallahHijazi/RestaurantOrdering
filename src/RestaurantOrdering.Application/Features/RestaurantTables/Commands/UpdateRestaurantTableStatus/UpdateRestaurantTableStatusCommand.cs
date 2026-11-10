using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.RestaurantTables.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Commands.UpdateRestaurantTableStatus;

public sealed record UpdateRestaurantTableStatusCommand(
    Guid RestaurantId,
    Guid TableId,
    bool IsActive) : IRequest<RestaurantTableDto>, IRestaurantScopedRequest;

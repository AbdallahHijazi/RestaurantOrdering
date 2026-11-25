using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.RestaurantUsers.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantUsers.Commands.SetRestaurantUserActive;

/// <summary>Activates or deactivates a staff account (the account and its history are kept).</summary>
public sealed record SetRestaurantUserActiveCommand(
    Guid RestaurantId,
    Guid UserId,
    bool IsActive) : IRequest<RestaurantUserDto>, IRestaurantScopedRequest;

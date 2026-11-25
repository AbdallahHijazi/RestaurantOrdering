using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.RestaurantUsers.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantUsers.Commands.UpdateRestaurantUserRole;

public sealed record UpdateRestaurantUserRoleCommand(
    Guid RestaurantId,
    Guid UserId,
    string Role) : IRequest<RestaurantUserRoleDto>, IRestaurantScopedRequest;

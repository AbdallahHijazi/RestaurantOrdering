using MediatR;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.RestaurantUsers.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantUsers.Commands.UpdateRestaurantUserRole;

public sealed class UpdateRestaurantUserRoleCommandHandler
    : IRequestHandler<UpdateRestaurantUserRoleCommand, RestaurantUserRoleDto>
{
    private readonly IRestaurantUserManagementService _restaurantUserManagementService;
    private readonly ICurrentUserService _currentUserService;

    public UpdateRestaurantUserRoleCommandHandler(
        IRestaurantUserManagementService restaurantUserManagementService,
        ICurrentUserService currentUserService)
    {
        _restaurantUserManagementService = restaurantUserManagementService;
        _currentUserService = currentUserService;
    }

    public Task<RestaurantUserRoleDto> Handle(
        UpdateRestaurantUserRoleCommand request,
        CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId
            ?? throw new UnauthorizedAccessException("Authentication is required.");

        return _restaurantUserManagementService.UpdateRestaurantStaffUserRoleAsync(
            request.RestaurantId,
            request.UserId,
            request.Role,
            currentUserId,
            cancellationToken);
    }
}

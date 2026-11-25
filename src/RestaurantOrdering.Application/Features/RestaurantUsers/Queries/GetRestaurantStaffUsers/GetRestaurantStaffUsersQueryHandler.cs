using MediatR;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.RestaurantUsers.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantUsers.Queries.GetRestaurantStaffUsers;

public sealed class GetRestaurantStaffUsersQueryHandler
    : IRequestHandler<GetRestaurantStaffUsersQuery, IReadOnlyList<RestaurantUserDto>>
{
    private readonly IRestaurantUserManagementService _restaurantUserManagementService;

    public GetRestaurantStaffUsersQueryHandler(
        IRestaurantUserManagementService restaurantUserManagementService)
    {
        _restaurantUserManagementService = restaurantUserManagementService;
    }

    public Task<IReadOnlyList<RestaurantUserDto>> Handle(
        GetRestaurantStaffUsersQuery request,
        CancellationToken cancellationToken) =>
        _restaurantUserManagementService.ListRestaurantStaffUsersAsync(
            request.RestaurantId,
            cancellationToken);
}

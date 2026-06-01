using RestaurantOrdering.Application.Features.RestaurantUsers.DTOs;

namespace RestaurantOrdering.Application.Common.Interfaces;

public interface IRestaurantUserManagementService
{
    Task<RestaurantUserDto> CreateRestaurantStaffUserAsync(
        Guid restaurantId,
        string email,
        string password,
        string? fullName,
        string? phoneNumber,
        string role,
        CancellationToken cancellationToken);

    Task<RestaurantUserRoleDto> UpdateRestaurantStaffUserRoleAsync(
        Guid restaurantId,
        Guid userId,
        string role,
        Guid currentUserId,
        CancellationToken cancellationToken);
}

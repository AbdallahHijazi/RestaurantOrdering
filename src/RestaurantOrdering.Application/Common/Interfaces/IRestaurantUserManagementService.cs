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

    Task<RestaurantUserDto> UpdateRestaurantStaffUserAsync(
        Guid restaurantId,
        Guid userId,
        string? fullName,
        string? phoneNumber,
        CancellationToken cancellationToken);

    Task<RestaurantUserDto> SetRestaurantStaffUserActiveAsync(
        Guid restaurantId,
        Guid userId,
        bool isActive,
        Guid currentUserId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<RestaurantUserDto>> ListRestaurantStaffUsersAsync(
        Guid restaurantId,
        CancellationToken cancellationToken);
}

using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Common.Interfaces;

public interface IRestaurantPermissionService
{
    Task<bool> HasPermissionAsync(
        Guid userId,
        Guid restaurantId,
        RestaurantPermission permission,
        CancellationToken cancellationToken);

    Task EnsurePermissionAsync(
        Guid userId,
        Guid restaurantId,
        RestaurantPermission permission,
        CancellationToken cancellationToken);
}

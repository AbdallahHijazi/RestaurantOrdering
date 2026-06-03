using RestaurantOrdering.Application.Common.Security;

namespace RestaurantOrdering.Application.Common.Interfaces;

public interface IUserDashboardAccessReader
{
    Task<UserDashboardAccessContext?> GetDashboardAccessContextAsync(
        Guid userId,
        Guid restaurantId,
        CancellationToken cancellationToken);

    Task<bool> HasDashboardAccessAsync(
        Guid userId,
        Guid restaurantId,
        CancellationToken cancellationToken);
}

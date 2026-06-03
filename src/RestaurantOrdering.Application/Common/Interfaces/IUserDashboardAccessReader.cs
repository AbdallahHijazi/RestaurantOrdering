namespace RestaurantOrdering.Application.Common.Interfaces;

public interface IUserDashboardAccessReader
{
    Task<bool> HasDashboardAccessAsync(
        Guid userId,
        Guid restaurantId,
        CancellationToken cancellationToken);
}

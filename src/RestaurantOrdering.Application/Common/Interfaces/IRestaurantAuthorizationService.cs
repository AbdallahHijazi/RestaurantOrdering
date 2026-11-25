namespace RestaurantOrdering.Application.Common.Interfaces;

public interface IRestaurantAuthorizationService
{
    Task EnsureCurrentUserOwnsRestaurantAsync(Guid restaurantId, CancellationToken cancellationToken);

    Task EnsureCurrentUserCanAccessRestaurantDashboardAsync(
        Guid restaurantId,
        CancellationToken cancellationToken);
}


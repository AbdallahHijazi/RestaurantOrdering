namespace RestaurantOrdering.Application.Common.Interfaces;

public interface IRestaurantAuthorizationService
{
    Task EnsureCurrentUserOwnsRestaurantAsync(Guid restaurantId, CancellationToken cancellationToken);
}


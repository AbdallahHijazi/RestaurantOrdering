namespace RestaurantOrdering.Application.Common.Security;

public interface IRestaurantScopedRequest
{
    Guid RestaurantId { get; }
}


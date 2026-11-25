namespace RestaurantOrdering.Application.Common.Security;

public interface IRestaurantDashboardScopedRequest
{
    Guid RestaurantId { get; }
}

namespace RestaurantOrdering.Application.Common.Security;

public static class ApplicationPolicies
{
    public const string RestaurantOwnerOnly = nameof(RestaurantOwnerOnly);
    public const string RestaurantDashboardAccess = nameof(RestaurantDashboardAccess);
    public const string KitchenDashboardAccess = nameof(KitchenDashboardAccess);
}

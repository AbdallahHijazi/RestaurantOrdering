namespace RestaurantOrdering.Application.Common.Security;

public sealed class UserDashboardAccessContext
{
    public required IReadOnlyList<string> Roles { get; init; }

    public bool HasFullOrderStatusControl =>
        Roles.Contains(ApplicationRoles.RestaurantOwner)
        || Roles.Contains(ApplicationRoles.RestaurantManager);
}

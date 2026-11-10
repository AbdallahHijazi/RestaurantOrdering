namespace RestaurantOrdering.Application.Common.Security;

public static class ApplicationRoles
{
    public const string RestaurantOwner = "RestaurantOwner";
    public const string RestaurantManager = "RestaurantManager";
    public const string KitchenManager = "KitchenManager";

    public static readonly IReadOnlyList<string> All =
    [
        RestaurantOwner,
        RestaurantManager,
        KitchenManager
    ];
}

public static class AssignableRestaurantStaffRoles
{
    public static readonly IReadOnlySet<string> Allowed = new HashSet<string>(StringComparer.Ordinal)
    {
        ApplicationRoles.RestaurantManager,
        ApplicationRoles.KitchenManager
    };

    public static readonly IReadOnlyList<string> All =
    [
        ApplicationRoles.RestaurantManager,
        ApplicationRoles.KitchenManager
    ];

    public static bool IsAllowed(string role) => Allowed.Contains(role);
}

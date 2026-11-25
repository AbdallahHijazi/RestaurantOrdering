using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Common.Security;

public static class RestaurantPermissionMatrix
{
    private static readonly IReadOnlyDictionary<string, IReadOnlySet<RestaurantPermission>> AssignablePermissionsByRole =
        new Dictionary<string, IReadOnlySet<RestaurantPermission>>(StringComparer.Ordinal)
        {
            [ApplicationRoles.RestaurantManager] = new HashSet<RestaurantPermission>
            {
                RestaurantPermission.RestaurantSettingsView,
                RestaurantPermission.RestaurantSettingsUpdateGeneral,
                RestaurantPermission.RestaurantSettingsManageLocales,
                RestaurantPermission.TranslationsView,
                RestaurantPermission.TranslationsEdit,
                RestaurantPermission.TranslationsReview,
                RestaurantPermission.TranslationsApprove,
                RestaurantPermission.TranslationsRetry,
                RestaurantPermission.TranslationsBulkApprove
            },
            [ApplicationRoles.KitchenManager] = new HashSet<RestaurantPermission>
            {
                RestaurantPermission.TranslationsView
            }
        };

    public static bool CanRoleReceivePermission(string role, RestaurantPermission permission) =>
        AssignablePermissionsByRole.TryGetValue(role, out var permissions) && permissions.Contains(permission);

    public static IReadOnlySet<RestaurantPermission> GetAssignablePermissions(string role) =>
        AssignablePermissionsByRole.TryGetValue(role, out var permissions)
            ? permissions
            : new HashSet<RestaurantPermission>();
}

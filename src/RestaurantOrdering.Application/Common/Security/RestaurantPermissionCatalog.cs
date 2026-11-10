using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Common.Security;

public static class RestaurantPermissionCatalog
{
    public static string ToStorageName(RestaurantPermission permission) => permission switch
    {
        RestaurantPermission.RestaurantSettingsView => "RestaurantSettings.View",
        RestaurantPermission.RestaurantSettingsUpdateGeneral => "RestaurantSettings.UpdateGeneral",
        RestaurantPermission.RestaurantSettingsManageLocales => "RestaurantSettings.ManageLocales",
        RestaurantPermission.TranslationsView => "Translations.View",
        RestaurantPermission.TranslationsEdit => "Translations.Edit",
        RestaurantPermission.TranslationsReview => "Translations.Review",
        RestaurantPermission.TranslationsApprove => "Translations.Approve",
        RestaurantPermission.TranslationsRetry => "Translations.Retry",
        RestaurantPermission.TranslationsBulkApprove => "Translations.BulkApprove",
        _ => throw new ArgumentOutOfRangeException(nameof(permission), permission, "Unknown restaurant permission.")
    };

    public static IReadOnlyList<RestaurantPermission> All { get; } =
        Enum.GetValues<RestaurantPermission>().Cast<RestaurantPermission>().ToList();
}

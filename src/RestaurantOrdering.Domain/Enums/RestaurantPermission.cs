namespace RestaurantOrdering.Domain.Enums;

public enum RestaurantPermission : byte
{
    RestaurantSettingsView = 1,
    RestaurantSettingsUpdateGeneral = 2,
    RestaurantSettingsManageLocales = 3,
    TranslationsView = 4,
    TranslationsEdit = 5,
    TranslationsReview = 6,
    TranslationsApprove = 7,
    TranslationsRetry = 8,
    TranslationsBulkApprove = 9
}

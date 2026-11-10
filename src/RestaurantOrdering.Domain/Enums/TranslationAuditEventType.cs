namespace RestaurantOrdering.Domain.Enums;

public enum TranslationAuditEventType : byte
{
    LocaleEnabled = 1,
    LocaleDisabled = 2,
    PrimaryLocaleChanged = 3,
    TranslationModeChanged = 4,
    TranslationManuallyEdited = 5,
    TranslationApproved = 6,
    TranslationRetried = 7,
    TranslationFailed = 8,
    AutoTranslationGenerated = 9,
    BulkTranslationsApproved = 10
}

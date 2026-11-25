using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Common.Translation;

internal static class TranslationJobIdempotency
{
    public static string BuildKey(
        TranslatableEntityType entityType,
        Guid entityId,
        string targetLocaleCode,
        int contentVersion) =>
        $"{entityType}:{entityId:N}:{targetLocaleCode}:{contentVersion}";
}

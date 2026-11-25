using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Translations.Common;

internal static class TranslationReviewAudit
{
    public static TranslationAuditLog Create(
        Guid restaurantId,
        Guid actorUserId,
        TranslationAuditEventType eventType,
        TranslatableEntityType entityType,
        Guid entityId,
        string? localeCode,
        DateTime createdAt,
        string? payloadJson = null) =>
        new()
        {
            RestaurantId = restaurantId,
            ActorUserId = actorUserId,
            EventType = eventType,
            EntityType = entityType,
            EntityId = entityId,
            LocaleCode = localeCode,
            PayloadJson = payloadJson,
            CreatedAt = createdAt
        };

    public static void Add(
        IApplicationDbContext context,
        Guid restaurantId,
        Guid actorUserId,
        TranslationAuditEventType eventType,
        ResolvedTranslation resolved,
        IDateTimeService dateTimeService,
        string? payloadJson = null) =>
        context.TranslationAuditLogs.Add(Create(
            restaurantId,
            actorUserId,
            eventType,
            ToEntityType(resolved.Kind),
            resolved.EntityId,
            resolved.LocaleCode,
            dateTimeService.UtcNow,
            payloadJson));

    private static TranslatableEntityType ToEntityType(TranslationReviewKind kind) =>
        kind switch
        {
            TranslationReviewKind.Restaurant => TranslatableEntityType.Restaurant,
            TranslationReviewKind.Category => TranslatableEntityType.Category,
            TranslationReviewKind.MenuItem => TranslatableEntityType.MenuItem,
            _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, "Unknown translation review kind.")
        };
}

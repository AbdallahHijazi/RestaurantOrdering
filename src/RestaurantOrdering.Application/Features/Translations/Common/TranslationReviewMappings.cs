using RestaurantOrdering.Application.Features.Translations.DTOs;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Translations.Common;

internal static class TranslationReviewMappings
{
    public static TranslationReviewDto ToDto(TranslationReviewSnapshot snapshot) =>
        new()
        {
            TranslationId = snapshot.TranslationId,
            EntityType = snapshot.EntityType.ToString(),
            EntityId = snapshot.EntityId,
            EntityDisplayName = snapshot.EntityDisplayName,
            Locale = snapshot.LocaleCode,
            DraftStatus = snapshot.DraftStatus?.ToString(),
            DraftSource = snapshot.DraftSource?.ToString(),
            DraftName = snapshot.DraftName,
            DraftDescription = snapshot.DraftDescription,
            DraftAddress = snapshot.DraftAddress,
            PublishedName = snapshot.PublishedName,
            PublishedDescription = snapshot.PublishedDescription,
            PublishedAddress = snapshot.PublishedAddress,
            DraftSourceVersion = snapshot.DraftSourceVersion,
            CurrentContentVersion = snapshot.ContentVersion,
            IsStale = IsStale(snapshot),
            CanApprove = CanApprove(snapshot),
            CanRetry = CanRetry(snapshot),
            UpdatedAt = snapshot.UpdatedAt
        };

    internal static bool IsStale(TranslationReviewSnapshot snapshot) =>
        snapshot.DraftStatus is not null
        && snapshot.DraftSourceVersion.HasValue
        && snapshot.DraftSourceVersion.Value != snapshot.ContentVersion;

    internal static bool CanApprove(TranslationReviewSnapshot snapshot) =>
        !IsStale(snapshot)
        && snapshot.DraftStatus == TranslationStatus.NeedsReview
        && !string.IsNullOrWhiteSpace(snapshot.DraftName);

    internal static bool CanRetry(TranslationReviewSnapshot snapshot) =>
        snapshot.DraftStatus == TranslationStatus.Failed
        || snapshot.HasFailedJobForCurrentVersion;
}

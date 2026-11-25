using FluentValidation;
using FluentValidation.Results;
using RestaurantOrdering.Application.Features.Translations.Common;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Translations.Common;

internal static class TranslationReviewValidation
{
    public static void EnsureDraftExists(ResolvedTranslation resolved)
    {
        if (!HasDraft(resolved))
        {
            throw new ValidationException(new[]
            {
                new ValidationFailure("draft", "No draft translation is available for review.")
            });
        }
    }

    public static void EnsureNotStale(ResolvedTranslation resolved)
    {
        if (IsStale(resolved))
        {
            throw new ValidationException(new[]
            {
                new ValidationFailure(
                    "draftSourceVersion",
                    "The draft is stale because the source content version has changed. Retry translation before editing or approving.")
            });
        }
    }

    public static void EnsureApprovable(ResolvedTranslation resolved)
    {
        EnsureDraftExists(resolved);
        EnsureNotStale(resolved);

        if (resolved.Kind switch
            {
                TranslationReviewKind.Restaurant => resolved.RestaurantTranslation!.DraftStatus,
                TranslationReviewKind.Category => resolved.CategoryTranslation!.DraftStatus,
                TranslationReviewKind.MenuItem => resolved.MenuItemTranslation!.DraftStatus,
                _ => null
            } != TranslationStatus.NeedsReview)
        {
            throw new ValidationException(new[]
            {
                new ValidationFailure("draftStatus", "Only drafts with NeedsReview status can be approved.")
            });
        }

        var draftName = resolved.Kind switch
        {
            TranslationReviewKind.Restaurant => resolved.RestaurantTranslation!.DraftName,
            TranslationReviewKind.Category => resolved.CategoryTranslation!.DraftName,
            TranslationReviewKind.MenuItem => resolved.MenuItemTranslation!.DraftName,
            _ => null
        };

        if (string.IsNullOrWhiteSpace(draftName))
        {
            throw new ValidationException(new[]
            {
                new ValidationFailure("draftName", "Draft name is required before approval.")
            });
        }
    }

    public static void EnsureRetryAllowed(ResolvedTranslation resolved, bool hasFailedJob)
    {
        var draftStatus = resolved.Kind switch
        {
            TranslationReviewKind.Restaurant => resolved.RestaurantTranslation!.DraftStatus,
            TranslationReviewKind.Category => resolved.CategoryTranslation!.DraftStatus,
            TranslationReviewKind.MenuItem => resolved.MenuItemTranslation!.DraftStatus,
            _ => null
        };

        if (draftStatus != TranslationStatus.Failed && !hasFailedJob)
        {
            throw new ValidationException(new[]
            {
                new ValidationFailure(
                    "retry",
                    "Retry is only allowed when the draft failed or a translation job failed for the current content version.")
            });
        }
    }

    private static bool HasDraft(ResolvedTranslation resolved) =>
        resolved.Kind switch
        {
            TranslationReviewKind.Restaurant => resolved.RestaurantTranslation!.DraftStatus is not null,
            TranslationReviewKind.Category => resolved.CategoryTranslation!.DraftStatus is not null,
            TranslationReviewKind.MenuItem => resolved.MenuItemTranslation!.DraftStatus is not null,
            _ => false
        };

    private static bool IsStale(ResolvedTranslation resolved)
    {
        var draftSourceVersion = resolved.Kind switch
        {
            TranslationReviewKind.Restaurant => resolved.RestaurantTranslation!.DraftSourceVersion,
            TranslationReviewKind.Category => resolved.CategoryTranslation!.DraftSourceVersion,
            TranslationReviewKind.MenuItem => resolved.MenuItemTranslation!.DraftSourceVersion,
            _ => null
        };

        return draftSourceVersion.HasValue && draftSourceVersion.Value != resolved.ContentVersion;
    }
}

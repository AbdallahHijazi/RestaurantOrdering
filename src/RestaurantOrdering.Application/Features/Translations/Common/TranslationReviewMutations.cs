using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Translations.Common;

internal static class TranslationReviewMutations
{
    public static void ApplyManualDraftEdit(
        ResolvedTranslation resolved,
        string name,
        string? description,
        string? address,
        DateTime now)
    {
        switch (resolved.Kind)
        {
            case TranslationReviewKind.Restaurant:
                ApplyManualDraftEdit(
                    resolved.RestaurantTranslation!,
                    name,
                    description,
                    address,
                    resolved.ContentVersion,
                    now);
                break;
            case TranslationReviewKind.Category:
                ApplyManualDraftEdit(
                    resolved.CategoryTranslation!,
                    name,
                    description,
                    resolved.ContentVersion,
                    now);
                break;
            case TranslationReviewKind.MenuItem:
                ApplyManualDraftEdit(
                    resolved.MenuItemTranslation!,
                    name,
                    description,
                    resolved.ContentVersion,
                    now);
                break;
        }
    }

    public static void ApplyApproval(
        ResolvedTranslation resolved,
        Guid approvedByUserId,
        DateTime approvedAt)
    {
        switch (resolved.Kind)
        {
            case TranslationReviewKind.Restaurant:
                ApplyApproval(resolved.RestaurantTranslation!, approvedByUserId, approvedAt);
                break;
            case TranslationReviewKind.Category:
                ApplyApproval(resolved.CategoryTranslation!, approvedByUserId, approvedAt);
                break;
            case TranslationReviewKind.MenuItem:
                ApplyApproval(resolved.MenuItemTranslation!, approvedByUserId, approvedAt);
                break;
        }
    }

    private static void ApplyManualDraftEdit(
        RestaurantTranslation translation,
        string name,
        string? description,
        string? address,
        int contentVersion,
        DateTime now)
    {
        translation.DraftName = name;
        translation.DraftDescription = NormalizeOptional(description);
        translation.DraftAddress = NormalizeOptional(address);
        translation.DraftSource = TranslationSource.Manual;
        translation.DraftStatus = TranslationStatus.NeedsReview;
        translation.DraftSourceVersion = contentVersion;
        translation.DraftLastError = null;
        translation.UpdatedAt = now;
    }

    private static void ApplyManualDraftEdit(
        CategoryTranslation translation,
        string name,
        string? description,
        int contentVersion,
        DateTime now)
    {
        translation.DraftName = name;
        translation.DraftDescription = NormalizeOptional(description);
        translation.DraftSource = TranslationSource.Manual;
        translation.DraftStatus = TranslationStatus.NeedsReview;
        translation.DraftSourceVersion = contentVersion;
        translation.DraftLastError = null;
        translation.UpdatedAt = now;
    }

    private static void ApplyManualDraftEdit(
        MenuItemTranslation translation,
        string name,
        string? description,
        int contentVersion,
        DateTime now)
    {
        translation.DraftName = name;
        translation.DraftDescription = NormalizeOptional(description);
        translation.DraftSource = TranslationSource.Manual;
        translation.DraftStatus = TranslationStatus.NeedsReview;
        translation.DraftSourceVersion = contentVersion;
        translation.DraftLastError = null;
        translation.UpdatedAt = now;
    }

    private static void ApplyApproval(
        RestaurantTranslation translation,
        Guid approvedByUserId,
        DateTime approvedAt)
    {
        translation.Name = translation.DraftName!.Trim();
        translation.Description = NormalizeOptional(translation.DraftDescription);
        translation.Address = NormalizeOptional(translation.DraftAddress);
        translation.PublishedSource = translation.DraftSource ?? TranslationSource.Manual;
        translation.PublishedSourceVersion = translation.DraftSourceVersion;
        translation.ApprovedAt = approvedAt;
        translation.ApprovedByUserId = approvedByUserId;
        ClearDraft(translation);
        translation.UpdatedAt = approvedAt;
    }

    private static void ApplyApproval(
        CategoryTranslation translation,
        Guid approvedByUserId,
        DateTime approvedAt)
    {
        translation.Name = translation.DraftName!.Trim();
        translation.Description = NormalizeOptional(translation.DraftDescription);
        translation.PublishedSource = translation.DraftSource ?? TranslationSource.Manual;
        translation.PublishedSourceVersion = translation.DraftSourceVersion;
        translation.ApprovedAt = approvedAt;
        translation.ApprovedByUserId = approvedByUserId;
        ClearDraft(translation);
        translation.UpdatedAt = approvedAt;
    }

    private static void ApplyApproval(
        MenuItemTranslation translation,
        Guid approvedByUserId,
        DateTime approvedAt)
    {
        translation.Name = translation.DraftName!.Trim();
        translation.Description = NormalizeOptional(translation.DraftDescription);
        translation.PublishedSource = translation.DraftSource ?? TranslationSource.Manual;
        translation.PublishedSourceVersion = translation.DraftSourceVersion;
        translation.ApprovedAt = approvedAt;
        translation.ApprovedByUserId = approvedByUserId;
        ClearDraft(translation);
        translation.UpdatedAt = approvedAt;
    }

    private static void ClearDraft(RestaurantTranslation translation)
    {
        translation.DraftName = null;
        translation.DraftDescription = null;
        translation.DraftAddress = null;
        translation.DraftStatus = null;
        translation.DraftSource = null;
        translation.DraftSourceVersion = null;
        translation.DraftGeneratedAt = null;
        translation.DraftLastError = null;
    }

    private static void ClearDraft(CategoryTranslation translation)
    {
        translation.DraftName = null;
        translation.DraftDescription = null;
        translation.DraftStatus = null;
        translation.DraftSource = null;
        translation.DraftSourceVersion = null;
        translation.DraftGeneratedAt = null;
        translation.DraftLastError = null;
    }

    private static void ClearDraft(MenuItemTranslation translation)
    {
        translation.DraftName = null;
        translation.DraftDescription = null;
        translation.DraftStatus = null;
        translation.DraftSource = null;
        translation.DraftSourceVersion = null;
        translation.DraftGeneratedAt = null;
        translation.DraftLastError = null;
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

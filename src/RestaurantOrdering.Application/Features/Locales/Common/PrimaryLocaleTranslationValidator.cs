using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using FluentValidation;
using FluentValidation.Results;

namespace RestaurantOrdering.Application.Features.Locales.Common;

internal static class PrimaryLocaleTranslationValidator
{
    internal sealed record MissingTranslationCounts(
        int MissingRestaurantTranslations,
        int MissingCategoryTranslations,
        int MissingMenuItemTranslations);

    internal static async Task<MissingTranslationCounts?> GetMissingCountsAsync(
        IApplicationDbContext context,
        Guid restaurantId,
        string targetLocaleCode,
        CancellationToken cancellationToken)
    {
        var restaurantHasTranslation = await context.RestaurantTranslations
            .AsNoTracking()
            .AnyAsync(
                translation => translation.RestaurantId == restaurantId
                               && translation.LocaleCode == targetLocaleCode
                               && translation.Name != null
                               && translation.Name.Trim() != string.Empty,
                cancellationToken);

        var missingCategoryCount = await context.Categories
            .AsNoTracking()
            .Where(category => category.RestaurantId == restaurantId && !category.IsDeleted)
            .Where(category => !context.CategoryTranslations.Any(
                translation => translation.CategoryId == category.Id
                               && translation.LocaleCode == targetLocaleCode
                               && translation.Name != null
                               && translation.Name.Trim() != string.Empty))
            .CountAsync(cancellationToken);

        var missingMenuItemCount = await context.MenuItems
            .AsNoTracking()
            .Where(item => item.RestaurantId == restaurantId && !item.IsDeleted)
            .Where(item => !context.MenuItemTranslations.Any(
                translation => translation.MenuItemId == item.Id
                               && translation.LocaleCode == targetLocaleCode
                               && translation.Name != null
                               && translation.Name.Trim() != string.Empty))
            .CountAsync(cancellationToken);

        var missingRestaurantCount = restaurantHasTranslation ? 0 : 1;
        var totalMissing = missingRestaurantCount + missingCategoryCount + missingMenuItemCount;

        if (totalMissing == 0)
        {
            return null;
        }

        return new MissingTranslationCounts(
            missingRestaurantCount,
            missingCategoryCount,
            missingMenuItemCount);
    }

    internal static ValidationException CreateValidationException(MissingTranslationCounts counts) =>
        new(new[]
        {
            new ValidationFailure(
                "missingRestaurantTranslations",
                counts.MissingRestaurantTranslations.ToString()),
            new ValidationFailure(
                "missingCategoryTranslations",
                counts.MissingCategoryTranslations.ToString()),
            new ValidationFailure(
                "missingMenuItemTranslations",
                counts.MissingMenuItemTranslations.ToString())
        });
}

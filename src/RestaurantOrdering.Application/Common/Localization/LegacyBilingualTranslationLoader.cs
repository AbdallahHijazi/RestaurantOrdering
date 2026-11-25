using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Common.Localization;

internal static class LegacyBilingualTranslationLoader
{
    public static async Task<IReadOnlyDictionary<string, RestaurantTranslation>> LoadRestaurantAsync(
        IApplicationDbContext context,
        Guid restaurantId,
        CancellationToken cancellationToken)
    {
        var translations = await context.RestaurantTranslations
            .AsNoTracking()
            .Where(t => t.RestaurantId == restaurantId && (t.LocaleCode == "ar" || t.LocaleCode == "en"))
            .ToListAsync(cancellationToken);

        return translations.ToDictionary(t => t.LocaleCode);
    }

    public static async Task<IReadOnlyDictionary<Guid, IReadOnlyDictionary<string, CategoryTranslation>>> LoadCategoriesAsync(
        IApplicationDbContext context,
        IReadOnlyCollection<Guid> categoryIds,
        CancellationToken cancellationToken)
    {
        if (categoryIds.Count == 0)
        {
            return new Dictionary<Guid, IReadOnlyDictionary<string, CategoryTranslation>>();
        }

        var translations = await context.CategoryTranslations
            .AsNoTracking()
            .Where(t => categoryIds.Contains(t.CategoryId) && (t.LocaleCode == "ar" || t.LocaleCode == "en"))
            .ToListAsync(cancellationToken);

        return translations
            .GroupBy(t => t.CategoryId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyDictionary<string, CategoryTranslation>)group.ToDictionary(t => t.LocaleCode));
    }

    public static async Task<IReadOnlyDictionary<Guid, IReadOnlyDictionary<string, MenuItemTranslation>>> LoadMenuItemsAsync(
        IApplicationDbContext context,
        IReadOnlyCollection<Guid> menuItemIds,
        CancellationToken cancellationToken)
    {
        if (menuItemIds.Count == 0)
        {
            return new Dictionary<Guid, IReadOnlyDictionary<string, MenuItemTranslation>>();
        }

        var translations = await context.MenuItemTranslations
            .AsNoTracking()
            .Where(t => menuItemIds.Contains(t.MenuItemId) && (t.LocaleCode == "ar" || t.LocaleCode == "en"))
            .ToListAsync(cancellationToken);

        return translations
            .GroupBy(t => t.MenuItemId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyDictionary<string, MenuItemTranslation>)group.ToDictionary(t => t.LocaleCode));
    }

    internal static CategoryTranslation? GetCategoryTranslation(
        IReadOnlyDictionary<Guid, IReadOnlyDictionary<string, CategoryTranslation>> lookup,
        Guid categoryId,
        string localeCode) =>
        lookup.TryGetValue(categoryId, out var byLocale) && byLocale.TryGetValue(localeCode, out var translation)
            ? translation
            : null;

    internal static MenuItemTranslation? GetMenuItemTranslation(
        IReadOnlyDictionary<Guid, IReadOnlyDictionary<string, MenuItemTranslation>> lookup,
        Guid menuItemId,
        string localeCode) =>
        lookup.TryGetValue(menuItemId, out var byLocale) && byLocale.TryGetValue(localeCode, out var translation)
            ? translation
            : null;
}

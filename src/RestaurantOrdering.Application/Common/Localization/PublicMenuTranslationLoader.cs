using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Common.Localization;

internal static class PublicMenuTranslationLoader
{
    public static async Task<IReadOnlyDictionary<string, PublicPublishedTranslationContent>> LoadRestaurantAsync(
        IApplicationDbContext context,
        Guid restaurantId,
        CancellationToken cancellationToken)
    {
        var translations = await context.RestaurantTranslations
            .AsNoTracking()
            .Where(item => item.RestaurantId == restaurantId)
            .ToListAsync(cancellationToken);

        return ToPublishedContent(translations);
    }

    public static async Task<IReadOnlyDictionary<Guid, IReadOnlyDictionary<string, PublicPublishedTranslationContent>>> LoadCategoriesAsync(
        IApplicationDbContext context,
        IReadOnlyCollection<Guid> categoryIds,
        CancellationToken cancellationToken)
    {
        if (categoryIds.Count == 0)
        {
            return new Dictionary<Guid, IReadOnlyDictionary<string, PublicPublishedTranslationContent>>();
        }

        var translations = await context.CategoryTranslations
            .AsNoTracking()
            .Where(item => categoryIds.Contains(item.CategoryId))
            .ToListAsync(cancellationToken);

        return translations
            .GroupBy(item => item.CategoryId)
            .ToDictionary(
                group => group.Key,
                group => ToPublishedContent(group));
    }

    public static async Task<IReadOnlyDictionary<Guid, IReadOnlyDictionary<string, PublicPublishedTranslationContent>>> LoadMenuItemsAsync(
        IApplicationDbContext context,
        IReadOnlyCollection<Guid> menuItemIds,
        CancellationToken cancellationToken)
    {
        if (menuItemIds.Count == 0)
        {
            return new Dictionary<Guid, IReadOnlyDictionary<string, PublicPublishedTranslationContent>>();
        }

        var translations = await context.MenuItemTranslations
            .AsNoTracking()
            .Where(item => menuItemIds.Contains(item.MenuItemId))
            .ToListAsync(cancellationToken);

        return translations
            .GroupBy(item => item.MenuItemId)
            .ToDictionary(
                group => group.Key,
                group => ToPublishedContent(group));
    }

    public static IReadOnlyDictionary<string, PublicPublishedTranslationContent> ToPublishedContent(
        IEnumerable<RestaurantTranslation> translations) =>
        translations.ToDictionary(
            item => item.LocaleCode,
            item => new PublicPublishedTranslationContent(
                item.Name,
                item.Description,
                item.Address,
                item.PublishedSourceVersion));

    private static IReadOnlyDictionary<string, PublicPublishedTranslationContent> ToPublishedContent(
        IEnumerable<CategoryTranslation> translations) =>
        translations.ToDictionary(
            item => item.LocaleCode,
            item => new PublicPublishedTranslationContent(
                item.Name,
                item.Description,
                Address: null,
                item.PublishedSourceVersion));

    private static IReadOnlyDictionary<string, PublicPublishedTranslationContent> ToPublishedContent(
        IEnumerable<MenuItemTranslation> translations) =>
        translations.ToDictionary(
            item => item.LocaleCode,
            item => new PublicPublishedTranslationContent(
                item.Name,
                item.Description,
                Address: null,
                item.PublishedSourceVersion));

    public static IReadOnlyDictionary<string, PublicPublishedTranslationContent> GetCategoryTranslations(
        IReadOnlyDictionary<Guid, IReadOnlyDictionary<string, PublicPublishedTranslationContent>> lookup,
        Guid categoryId) =>
        lookup.TryGetValue(categoryId, out var translations)
            ? translations
            : new Dictionary<string, PublicPublishedTranslationContent>();

    public static IReadOnlyDictionary<string, PublicPublishedTranslationContent> GetMenuItemTranslations(
        IReadOnlyDictionary<Guid, IReadOnlyDictionary<string, PublicPublishedTranslationContent>> lookup,
        Guid menuItemId) =>
        lookup.TryGetValue(menuItemId, out var translations)
            ? translations
            : new Dictionary<string, PublicPublishedTranslationContent>();
}

using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Common.Translation;

internal static class TranslationSourceContentLoader
{
    public static async Task<TranslationFields> LoadCategoryAsync(
        IApplicationDbContext context,
        Category category,
        string defaultLocale,
        CancellationToken cancellationToken)
    {
        var (name, description) = await PrimaryLocaleContentVersion.GetCategoryContentAsync(
            context,
            category,
            defaultLocale,
            cancellationToken);

        return new TranslationFields(
            name ?? string.Empty,
            description);
    }

    public static async Task<TranslationFields> LoadMenuItemAsync(
        IApplicationDbContext context,
        MenuItem menuItem,
        string defaultLocale,
        CancellationToken cancellationToken)
    {
        var (name, description) = await PrimaryLocaleContentVersion.GetMenuItemContentAsync(
            context,
            menuItem,
            defaultLocale,
            cancellationToken);

        return new TranslationFields(
            name ?? string.Empty,
            description);
    }

    public static async Task<TranslationFields> LoadRestaurantAsync(
        IApplicationDbContext context,
        Restaurant restaurant,
        string defaultLocale,
        CancellationToken cancellationToken)
    {
        var (name, description, address) = await PrimaryLocaleContentVersion.GetRestaurantContentAsync(
            context,
            restaurant,
            defaultLocale,
            cancellationToken);

        return new TranslationFields(
            name ?? string.Empty,
            description,
            address);
    }
}

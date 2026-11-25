using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Common.Localization;

internal sealed record PublicLocaleContext(
    string DefaultLocale,
    IReadOnlyList<PublicRestaurantSupportedLocale> SupportedLocales,
    IReadOnlyDictionary<string, PublicLocaleDefinitionInfo> LocaleDefinitions);

internal static class PublicLocaleContextLoader
{
    public static async Task<PublicLocaleContext> LoadAsync(
        IApplicationDbContext context,
        Guid restaurantId,
        string? configuredDefaultLocale,
        CancellationToken cancellationToken)
    {
        var defaultLocale = string.IsNullOrWhiteSpace(configuredDefaultLocale)
            ? "ar"
            : configuredDefaultLocale.Trim().ToLowerInvariant();

        var supportedLocales = await context.RestaurantSupportedLocales
            .AsNoTracking()
            .Where(item => item.RestaurantId == restaurantId)
            .OrderBy(item => item.SortOrder)
            .Select(item => new PublicRestaurantSupportedLocale(item.LocaleCode, item.IsEnabled, item.SortOrder))
            .ToListAsync(cancellationToken);

        if (supportedLocales.Count == 0)
        {
            supportedLocales =
            [
                new PublicRestaurantSupportedLocale("ar", true, 1),
                new PublicRestaurantSupportedLocale("en", true, 2)
            ];
        }

        var localeDefinitions = await context.LocaleDefinitions
            .AsNoTracking()
            .Where(item => item.IsEnabled)
            .ToDictionaryAsync(
                item => item.Code,
                item => new PublicLocaleDefinitionInfo(
                    item.Code,
                    item.Direction == TextDirection.Rtl ? "rtl" : "ltr"),
                cancellationToken);

        return new PublicLocaleContext(defaultLocale, supportedLocales, localeDefinitions);
    }
}

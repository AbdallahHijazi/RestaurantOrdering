using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Common.Localization;

internal static class PrimaryLocaleContentVersion
{
    public static async Task<(string? Name, string? Description)> GetCategoryContentAsync(
        IApplicationDbContext context,
        Category category,
        string defaultLocale,
        CancellationToken cancellationToken)
    {
        if (string.Equals(defaultLocale, "ar", StringComparison.Ordinal))
        {
            return (category.NameAr, category.DescriptionAr);
        }

        if (string.Equals(defaultLocale, "en", StringComparison.Ordinal))
        {
            return (category.NameEn, category.DescriptionEn);
        }

        var translation = await context.CategoryTranslations
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.CategoryId == category.Id && item.LocaleCode == defaultLocale,
                cancellationToken);

        return (translation?.Name, translation?.Description);
    }

    public static async Task<(string? Name, string? Description)> GetMenuItemContentAsync(
        IApplicationDbContext context,
        MenuItem menuItem,
        string defaultLocale,
        CancellationToken cancellationToken)
    {
        if (string.Equals(defaultLocale, "ar", StringComparison.Ordinal))
        {
            return (menuItem.NameAr, menuItem.DescriptionAr);
        }

        if (string.Equals(defaultLocale, "en", StringComparison.Ordinal))
        {
            return (menuItem.NameEn, menuItem.DescriptionEn);
        }

        var translation = await context.MenuItemTranslations
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.MenuItemId == menuItem.Id && item.LocaleCode == defaultLocale,
                cancellationToken);

        return (translation?.Name, translation?.Description);
    }

    public static async Task<(string? Name, string? Description, string? Address)> GetRestaurantContentAsync(
        IApplicationDbContext context,
        Restaurant restaurant,
        string defaultLocale,
        CancellationToken cancellationToken)
    {
        if (string.Equals(defaultLocale, "ar", StringComparison.Ordinal))
        {
            return (restaurant.NameAr, restaurant.DescriptionAr, restaurant.AddressAr);
        }

        if (string.Equals(defaultLocale, "en", StringComparison.Ordinal))
        {
            return (restaurant.NameEn, restaurant.DescriptionEn, restaurant.AddressEn);
        }

        var translation = await context.RestaurantTranslations
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.RestaurantId == restaurant.Id && item.LocaleCode == defaultLocale,
                cancellationToken);

        return (translation?.Name, translation?.Description, translation?.Address);
    }

    public static bool BumpCategoryIfPrimaryContentChanged(
        Category category,
        string? currentName,
        string? currentDescription,
        string name,
        string? description)
    {
        if (!HasChanged(currentName, name) && !HasChanged(currentDescription, description))
        {
            return false;
        }

        category.ContentVersion++;
        return true;
    }

    public static bool BumpMenuItemIfPrimaryContentChanged(
        MenuItem menuItem,
        string? currentName,
        string? currentDescription,
        string name,
        string? description)
    {
        if (!HasChanged(currentName, name) && !HasChanged(currentDescription, description))
        {
            return false;
        }

        menuItem.ContentVersion++;
        return true;
    }

    public static bool BumpRestaurantIfPrimaryContentChanged(
        Restaurant restaurant,
        string? currentName,
        string? currentDescription,
        string? currentAddress,
        string name,
        string? description,
        string? address)
    {
        if (!HasChanged(currentName, name) &&
            !HasChanged(currentDescription, description) &&
            !HasChanged(currentAddress, address))
        {
            return false;
        }

        restaurant.ContentVersion++;
        return true;
    }

    private static bool HasChanged(string? current, string? incoming) =>
        !string.Equals(Normalize(current), Normalize(incoming), StringComparison.Ordinal);

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

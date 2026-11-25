using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Common.Localization;

internal static class TranslatableContentVersion
{
    public static void BumpRestaurantIfTranslatableContentChanged(
        Restaurant restaurant,
        string nameAr,
        string? nameEn,
        string? descriptionAr,
        string? descriptionEn,
        string? addressAr,
        string? addressEn)
    {
        if (HasChanged(restaurant.NameAr, nameAr) ||
            HasChanged(restaurant.NameEn, nameEn) ||
            HasChanged(restaurant.DescriptionAr, descriptionAr) ||
            HasChanged(restaurant.DescriptionEn, descriptionEn) ||
            HasChanged(restaurant.AddressAr, addressAr) ||
            HasChanged(restaurant.AddressEn, addressEn))
        {
            restaurant.ContentVersion++;
        }
    }

    public static void BumpCategoryIfTranslatableContentChanged(
        Category category,
        string nameAr,
        string? nameEn,
        string? descriptionAr,
        string? descriptionEn)
    {
        if (HasChanged(category.NameAr, nameAr) ||
            HasChanged(category.NameEn, nameEn) ||
            HasChanged(category.DescriptionAr, descriptionAr) ||
            HasChanged(category.DescriptionEn, descriptionEn))
        {
            category.ContentVersion++;
        }
    }

    public static void BumpMenuItemIfTranslatableContentChanged(
        MenuItem menuItem,
        string nameAr,
        string? nameEn,
        string? descriptionAr,
        string? descriptionEn)
    {
        if (HasChanged(menuItem.NameAr, nameAr) ||
            HasChanged(menuItem.NameEn, nameEn) ||
            HasChanged(menuItem.DescriptionAr, descriptionAr) ||
            HasChanged(menuItem.DescriptionEn, descriptionEn))
        {
            menuItem.ContentVersion++;
        }
    }

    private static bool HasChanged(string? current, string? incoming) =>
        !string.Equals(Normalize(current), Normalize(incoming), StringComparison.Ordinal);

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

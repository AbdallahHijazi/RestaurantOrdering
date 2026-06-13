using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Common.Localization;

internal static class PrimaryLocaleLegacySync
{
    public static void ApplyCategory(Category category, string localeCode, string name, string? description)
    {
        switch (localeCode)
        {
            case "ar":
                category.NameAr = name;
                category.DescriptionAr = description;
                break;
            case "en":
                category.NameEn = name;
                category.DescriptionEn = description;
                break;
        }
    }

    public static void ApplyMenuItem(MenuItem menuItem, string localeCode, string name, string? description)
    {
        switch (localeCode)
        {
            case "ar":
                menuItem.NameAr = name;
                menuItem.DescriptionAr = description;
                break;
            case "en":
                menuItem.NameEn = name;
                menuItem.DescriptionEn = description;
                break;
        }
    }

    public static void ApplyRestaurant(
        Restaurant restaurant,
        string localeCode,
        string name,
        string? description,
        string? address)
    {
        switch (localeCode)
        {
            case "ar":
                restaurant.NameAr = name;
                restaurant.DescriptionAr = description;
                restaurant.AddressAr = address;
                break;
            case "en":
                restaurant.NameEn = name;
                restaurant.DescriptionEn = description;
                restaurant.AddressEn = address;
                break;
        }
    }
}

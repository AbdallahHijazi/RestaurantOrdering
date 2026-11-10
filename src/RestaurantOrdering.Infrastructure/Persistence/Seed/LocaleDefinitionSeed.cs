using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Infrastructure.Persistence.Seed;

internal static class LocaleDefinitionSeed
{
    internal static readonly LocaleDefinition[] All =
    [
        new() { Code = "ar", DisplayName = "Arabic", NativeName = "العربية", Direction = TextDirection.Rtl, IsEnabled = true, SortOrder = 1 },
        new() { Code = "en", DisplayName = "English", NativeName = "English", Direction = TextDirection.Ltr, IsEnabled = true, SortOrder = 2 },
        new() { Code = "fr", DisplayName = "French", NativeName = "Français", Direction = TextDirection.Ltr, IsEnabled = true, SortOrder = 3 },
        new() { Code = "de", DisplayName = "German", NativeName = "Deutsch", Direction = TextDirection.Ltr, IsEnabled = true, SortOrder = 4 },
        new() { Code = "es", DisplayName = "Spanish", NativeName = "Español", Direction = TextDirection.Ltr, IsEnabled = true, SortOrder = 5 },
        new() { Code = "it", DisplayName = "Italian", NativeName = "Italiano", Direction = TextDirection.Ltr, IsEnabled = true, SortOrder = 6 },
        new() { Code = "tr", DisplayName = "Turkish", NativeName = "Türkçe", Direction = TextDirection.Ltr, IsEnabled = true, SortOrder = 7 },
        new() { Code = "fa", DisplayName = "Persian", NativeName = "فارسی", Direction = TextDirection.Rtl, IsEnabled = true, SortOrder = 8 },
        new() { Code = "he", DisplayName = "Hebrew", NativeName = "עברית", Direction = TextDirection.Rtl, IsEnabled = true, SortOrder = 9 }
    ];
}

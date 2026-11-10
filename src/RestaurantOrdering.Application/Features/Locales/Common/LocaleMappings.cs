using RestaurantOrdering.Application.Features.Locales.DTOs;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Locales.Common;

public static class LocaleMappings
{
    public static SystemLocaleDto ToSystemDto(this LocaleDefinition locale) => new()
    {
        Code = locale.Code,
        DisplayName = locale.DisplayName,
        NativeName = locale.NativeName,
        Direction = ToApiDirection(locale.Direction)
    };

    public static RestaurantSupportedLocaleDto ToSupportedDto(this RestaurantSupportedLocale locale) => new()
    {
        Code = locale.LocaleCode,
        IsEnabled = locale.IsEnabled,
        SortOrder = locale.SortOrder
    };

    public static string ToApiDirection(TextDirection direction) =>
        direction switch
        {
            TextDirection.Rtl => "rtl",
            TextDirection.Ltr => "ltr",
            _ => "ltr"
        };
}

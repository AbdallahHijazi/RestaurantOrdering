using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Locales.Common;

public static class TranslationModeParser
{
    public static bool TryParse(string? value, out TranslationMode mode)
    {
        mode = default;

        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        return Enum.TryParse(value.Trim(), ignoreCase: true, out mode)
               && Enum.IsDefined(mode);
    }

    public static string ToApiValue(TranslationMode mode) => mode.ToString();
}

using FluentValidation;
using FluentValidation.Results;

namespace RestaurantOrdering.Application.Features.Locales.Common;

internal static class TransitionalPrimaryLocaleGuard
{
    private static readonly HashSet<string> AllowedDefaultLocales = new(StringComparer.Ordinal)
    {
        "ar",
        "en"
    };

    internal static void EnsureAllowedDefaultLocale(string defaultLocale)
    {
        if (AllowedDefaultLocales.Contains(defaultLocale))
        {
            return;
        }

        throw new ValidationException(new[]
        {
            new ValidationFailure(
                nameof(defaultLocale),
                $"Changing the primary content locale to '{defaultLocale}' is not available until dynamic catalog authoring is enabled. You can enable the locale for the public menu now, but keep the primary locale as 'ar' or 'en'.")
        });
    }
}

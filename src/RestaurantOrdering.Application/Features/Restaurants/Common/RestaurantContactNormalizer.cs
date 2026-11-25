using System.Text.RegularExpressions;

namespace RestaurantOrdering.Application.Features.Restaurants.Common;

/// <summary>Validation patterns and normalisation for the restaurant locale/contact profile fields.</summary>
public static class RestaurantContactNormalizer
{
    public static readonly Regex CountryCodePattern =
        new(@"^[A-Za-z]{2}$", RegexOptions.Compiled);

    // International dialling prefix: optional '+', 1-4 digits.
    public static readonly Regex PhoneCountryCodePattern =
        new(@"^\+?[0-9]{1,4}$", RegexOptions.Compiled);

    public static string? NormalizeCountryCode(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed.ToUpperInvariant();
    }

    public static string? NormalizePhoneCountryCode(string? value)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return null;
        }

        return trimmed.StartsWith('+') ? trimmed : "+" + trimmed;
    }

    public static string? NormalizeOptionalText(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }
}

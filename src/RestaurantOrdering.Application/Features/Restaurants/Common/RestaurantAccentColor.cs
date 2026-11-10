using System.Text.RegularExpressions;

namespace RestaurantOrdering.Application.Features.Restaurants.Common;

public static partial class RestaurantAccentColor
{
    public const string Default = "#B8663F";

    public static bool IsValid(string? value) =>
        !string.IsNullOrWhiteSpace(value) && HexPattern().IsMatch(value.Trim());

    public static string Normalize(string value)
    {
        var trimmed = value.Trim();
        return IsValid(trimmed) ? trimmed.ToUpperInvariant() : Default;
    }

    [GeneratedRegex(@"^#[0-9A-Fa-f]{6}$", RegexOptions.Compiled)]
    private static partial Regex HexPattern();
}

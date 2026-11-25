using System.Text.RegularExpressions;

namespace RestaurantOrdering.Application.Features.Orders.Commands.CreatePublicOrder;

/// <summary>
/// Practical, country-agnostic validation for customer phone numbers on public orders.
/// Accepts local and international notations (optional leading '+' or '00', spaces, dots,
/// hyphens and parentheses as separators, Latin or Arabic-Indic digits) and requires
/// between <see cref="MinDigits"/> and <see cref="MaxDigits"/> digits (E.164 allows at most 15).
/// The frontend checkout mirrors this rule.
/// </summary>
public static class CustomerPhoneValidation
{
    public const int MinDigits = 7;
    public const int MaxDigits = 15;
    public const int MaxLength = 20;

    private static readonly Regex AllowedCharacters = new(
        @"^\+?[0-9٠-٩۰-۹\s().\-]+$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public static bool IsValid(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            return false;
        }

        var value = phone.Trim();

        if (value.Length > MaxLength || !AllowedCharacters.IsMatch(value))
        {
            return false;
        }

        var digits = new List<char>(value.Length);
        foreach (var ch in value)
        {
            if (IsDigit(ch))
            {
                digits.Add(ch);
            }
        }

        // A leading "00" is the international call prefix, not part of the subscriber number.
        if (digits.Count >= 2 && ToAscii(digits[0]) == '0' && ToAscii(digits[1]) == '0' && !value.StartsWith('+'))
        {
            digits.RemoveRange(0, 2);
        }

        return digits.Count is >= MinDigits and <= MaxDigits;
    }

    private static bool IsDigit(char ch) =>
        ch is >= '0' and <= '9' or >= '٠' and <= '٩' or >= '۰' and <= '۹';

    private static char ToAscii(char ch) => ch switch
    {
        >= '٠' and <= '٩' => (char)('0' + (ch - '٠')),
        >= '۰' and <= '۹' => (char)('0' + (ch - '۰')),
        _ => ch
    };
}

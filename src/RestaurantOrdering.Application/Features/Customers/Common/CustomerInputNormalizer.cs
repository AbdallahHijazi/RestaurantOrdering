namespace RestaurantOrdering.Application.Features.Customers.Common;

internal static class CustomerInputNormalizer
{
    public static string? ToOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

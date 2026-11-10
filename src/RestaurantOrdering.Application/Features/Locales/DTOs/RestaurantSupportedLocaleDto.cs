namespace RestaurantOrdering.Application.Features.Locales.DTOs;

public sealed class RestaurantSupportedLocaleDto
{
    public string Code { get; init; } = string.Empty;
    public bool IsEnabled { get; init; }
    public int SortOrder { get; init; }
}

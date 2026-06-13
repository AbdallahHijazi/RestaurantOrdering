namespace RestaurantOrdering.Application.Features.Locales.DTOs;

public sealed class SystemLocaleDto
{
    public string Code { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string NativeName { get; init; } = string.Empty;
    public string Direction { get; init; } = string.Empty;
}

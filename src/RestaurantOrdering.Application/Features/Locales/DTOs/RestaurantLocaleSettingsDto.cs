namespace RestaurantOrdering.Application.Features.Locales.DTOs;

public sealed class RestaurantLocaleSettingsDto
{
    public string DefaultLocale { get; init; } = string.Empty;
    public string TranslationMode { get; init; } = string.Empty;
    public IReadOnlyList<RestaurantSupportedLocaleDto> SupportedLocales { get; init; } = Array.Empty<RestaurantSupportedLocaleDto>();
    public IReadOnlyList<SystemLocaleDto> AvailableLocales { get; init; } = Array.Empty<SystemLocaleDto>();
    public bool CanManageLocales { get; init; }
}

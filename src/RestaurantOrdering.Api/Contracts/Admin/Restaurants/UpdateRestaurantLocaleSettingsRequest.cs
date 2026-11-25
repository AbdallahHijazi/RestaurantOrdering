namespace RestaurantOrdering.Api.Contracts.Admin.Restaurants;

public sealed class UpdateRestaurantLocaleSettingsRequest
{
    public string DefaultLocale { get; init; } = string.Empty;
    public IReadOnlyList<UpdateRestaurantSupportedLocaleRequest> SupportedLocales { get; init; } =
        Array.Empty<UpdateRestaurantSupportedLocaleRequest>();
    public string TranslationMode { get; init; } = string.Empty;
}

public sealed class UpdateRestaurantSupportedLocaleRequest
{
    public string Code { get; init; } = string.Empty;
    public bool IsEnabled { get; init; }
    public int SortOrder { get; init; }
}

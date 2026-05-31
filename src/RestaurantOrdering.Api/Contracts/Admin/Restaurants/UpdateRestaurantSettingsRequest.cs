namespace RestaurantOrdering.Api.Contracts.Admin.Restaurants;

public sealed class UpdateRestaurantSettingsRequest
{
    public string CurrencyCode { get; init; } = string.Empty;
    public string TimeZone { get; init; } = string.Empty;
    public decimal TaxRate { get; init; }
    public decimal DeliveryFee { get; init; }
    public decimal MinimumOrderAmount { get; init; }
    public bool IsDeliveryEnabled { get; init; }
    public bool IsPickupEnabled { get; init; }
    public string? WorkingHoursJson { get; init; }
}

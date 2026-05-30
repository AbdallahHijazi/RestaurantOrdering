namespace RestaurantOrdering.Application.Features.RestaurantSettings.DTOs;

public class RestaurantSettingsDto
{
    public Guid Id { get; init; }
    public Guid RestaurantId { get; init; }
    public string CurrencyCode { get; init; } = string.Empty;
    public string TimeZone { get; init; } = string.Empty;
    public decimal TaxRate { get; init; }
    public decimal DeliveryFee { get; init; }
    public decimal MinimumOrderAmount { get; init; }
    public bool IsDeliveryEnabled { get; init; }
    public bool IsPickupEnabled { get; init; }
    public string? WorkingHoursJson { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

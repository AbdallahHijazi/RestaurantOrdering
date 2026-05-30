using RestaurantOrdering.Domain.Common;

namespace RestaurantOrdering.Domain.Entities;

public class RestaurantSettings : AuditableEntity
{
    public Guid RestaurantId { get; set; }
    public string CurrencyCode { get; set; } = "USD";
    public string TimeZone { get; set; } = "UTC";
    public decimal TaxRate { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal MinimumOrderAmount { get; set; }
    public bool IsDeliveryEnabled { get; set; } = true;
    public bool IsPickupEnabled { get; set; } = true;
    public string? WorkingHoursJson { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
}

using RestaurantOrdering.Domain.Common;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Domain.Entities;

public class Order : AuditableEntity, ISoftDelete
{
    public Guid RestaurantId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public Guid? CustomerId { get; set; }
    public string? GuestName { get; set; }
    public string? GuestPhone { get; set; }
    public OrderType OrderType { get; set; }
    public Guid? TableId { get; set; }
    public OrderStatus OrderStatus { get; set; }
    public string? DeliveryAddress { get; set; }
    public decimal? DeliveryLatitude { get; set; }
    public decimal? DeliveryLongitude { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal TotalAmount { get; set; }
    public string CurrencyCode { get; set; } = "USD";
    public string? Notes { get; set; }
    public string? RequestedLocale { get; set; }
    public string ResolvedLocale { get; set; } = "ar";
    public bool FallbackApplied { get; set; }
    public bool IsDeleted { get; set; }

    /// <summary>Client-supplied key identifying one logical checkout attempt (public orders).</summary>
    public string? IdempotencyKey { get; set; }
    /// <summary>SHA-256 hex fingerprint of the request that created the order (replay/mismatch detection).</summary>
    public string? IdempotencyRequestHash { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public RestaurantTable? Table { get; set; }
    public Customer? Customer { get; set; }
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}

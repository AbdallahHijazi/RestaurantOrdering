using RestaurantOrdering.Domain.Common;

namespace RestaurantOrdering.Domain.Entities;

public class OrderItem : AuditableEntity
{
    public Guid OrderId { get; set; }
    public Guid? MenuItemId { get; set; }
    public string ItemNameAr { get; set; } = string.Empty;
    public string? ItemNameEn { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal TotalPrice { get; set; }
    public string? Notes { get; set; }

    public Order Order { get; set; } = null!;
    public MenuItem? MenuItem { get; set; }
}

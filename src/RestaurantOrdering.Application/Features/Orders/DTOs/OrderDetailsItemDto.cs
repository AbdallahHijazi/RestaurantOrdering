namespace RestaurantOrdering.Application.Features.Orders.DTOs;

public class OrderDetailsItemDto
{
    public Guid Id { get; init; }
    public Guid? MenuItemId { get; init; }
    public string ItemNameAr { get; init; } = string.Empty;
    public string? ItemNameEn { get; init; }
    public decimal UnitPrice { get; init; }
    public int Quantity { get; init; }
    public decimal TotalPrice { get; init; }
    public string? Notes { get; init; }
}

using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.Orders.DTOs;

public class PublicOrderConfirmationItemDto
{
    public Guid? MenuItemSizeId { get; init; }
    public string? SizeName { get; init; }
    public Guid? MenuItemId { get; init; }
    public string ItemNameAr { get; init; } = string.Empty;
    public string? ItemNameEn { get; init; }
    public string DisplayedItemName { get; init; } = string.Empty;
    public string DisplayedLocale { get; init; } = "ar";
    public decimal? BaseUnitPrice { get; init; }
    public decimal? UnitDiscountAmount { get; init; }
    public MenuDiscountType? AppliedDiscountType { get; init; }
    public decimal? AppliedDiscountValue { get; init; }
    public decimal UnitPrice { get; init; }
    public int Quantity { get; init; }
    public decimal TotalPrice { get; init; }
    public string? Notes { get; init; }
}

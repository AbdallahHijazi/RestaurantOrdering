using RestaurantOrdering.Application.Features.Orders.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.Orders.Common;

public static class OrderItemDisplayProjection
{
    public static string ResolveDisplayedItemName(
        string? displayedItemName,
        string itemNameAr,
        string? itemNameEn)
    {
        if (!string.IsNullOrWhiteSpace(displayedItemName))
        {
            return displayedItemName.Trim();
        }

        if (!string.IsNullOrWhiteSpace(itemNameAr))
        {
            return itemNameAr.Trim();
        }

        if (!string.IsNullOrWhiteSpace(itemNameEn))
        {
            return itemNameEn.Trim();
        }

        return "—";
    }

    public static string ResolveDisplayedLocale(string? displayedLocale, string? orderResolvedLocale)
    {
        if (!string.IsNullOrWhiteSpace(displayedLocale))
        {
            return displayedLocale.Trim().ToLowerInvariant();
        }

        if (!string.IsNullOrWhiteSpace(orderResolvedLocale))
        {
            return orderResolvedLocale.Trim().ToLowerInvariant();
        }

        return "ar";
    }

    public static OrderDetailsItemDto ToOrderDetailsItemDto(OrderItem item, string? orderResolvedLocale) =>
        new()
        {
            Id = item.Id,
            MenuItemId = item.MenuItemId,
            ItemNameAr = item.ItemNameAr,
            ItemNameEn = item.ItemNameEn,
            DisplayedItemName = ResolveDisplayedItemName(
                item.DisplayedItemName,
                item.ItemNameAr,
                item.ItemNameEn),
            DisplayedLocale = ResolveDisplayedLocale(item.DisplayedLocale, orderResolvedLocale),
            UnitPrice = item.UnitPrice,
            Quantity = item.Quantity,
            TotalPrice = item.TotalPrice,
            Notes = item.Notes
        };

    public static PublicOrderConfirmationItemDto ToConfirmationItemDto(
        OrderItem item,
        string? orderResolvedLocale) =>
        new()
        {
            MenuItemId = item.MenuItemId,
            ItemNameAr = item.ItemNameAr,
            ItemNameEn = item.ItemNameEn,
            DisplayedItemName = ResolveDisplayedItemName(
                item.DisplayedItemName,
                item.ItemNameAr,
                item.ItemNameEn),
            DisplayedLocale = ResolveDisplayedLocale(item.DisplayedLocale, orderResolvedLocale),
            UnitPrice = item.UnitPrice,
            Quantity = item.Quantity,
            TotalPrice = item.TotalPrice,
            Notes = item.Notes
        };
}

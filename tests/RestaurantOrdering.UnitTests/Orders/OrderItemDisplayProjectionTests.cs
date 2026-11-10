using FluentAssertions;
using RestaurantOrdering.Application.Features.Orders.Common;
using RestaurantOrdering.Application.Features.Orders.DTOs;
using RestaurantOrdering.Domain.Entities;
using Xunit;

namespace RestaurantOrdering.UnitTests.Orders;

public sealed class OrderItemDisplayProjectionTests
{
    [Theory]
    [InlineData("Item FR", "صنف", "Item EN", "Item FR")]
    [InlineData("  Item FR  ", "صنف", "Item EN", "Item FR")]
    [InlineData("", "صنف", "Item EN", "صنف")]
    [InlineData(null, "صنف", "Item EN", "صنف")]
    [InlineData("", "", "Item EN", "Item EN")]
    [InlineData("", "", "", "—")]
    public void ResolveDisplayedItemName_UsesSnapshotThenLegacyFallback(
        string? displayedItemName,
        string itemNameAr,
        string? itemNameEn,
        string expected)
    {
        OrderItemDisplayProjection.ResolveDisplayedItemName(displayedItemName, itemNameAr, itemNameEn)
            .Should().Be(expected);
    }

    [Theory]
    [InlineData("fr", "de", "fr")]
    [InlineData("", "de", "de")]
    [InlineData(null, "de", "de")]
    [InlineData("", "", "ar")]
    public void ResolveDisplayedLocale_UsesItemThenOrderFallback(
        string? displayedLocale,
        string? orderResolvedLocale,
        string expected)
    {
        OrderItemDisplayProjection.ResolveDisplayedLocale(displayedLocale, orderResolvedLocale)
            .Should().Be(expected);
    }

    [Fact]
    public void ToOrderDetailsItemDto_PreservesLegacyFieldsAndAddsDisplayedFields()
    {
        var item = new OrderItem
        {
            Id = Guid.Parse("aaaaaaaa-1111-1111-1111-111111111111"),
            MenuItemId = Guid.Parse("aaaaaaaa-2222-2222-2222-222222222222"),
            ItemNameAr = "صنف اختبار",
            ItemNameEn = "Test Item",
            DisplayedItemName = "Item FR",
            DisplayedLocale = "fr",
            UnitPrice = 10m,
            Quantity = 2,
            TotalPrice = 20m,
            Notes = "no onions"
        };

        var dto = OrderItemDisplayProjection.ToOrderDetailsItemDto(item, "de");

        dto.ItemNameAr.Should().Be("صنف اختبار");
        dto.ItemNameEn.Should().Be("Test Item");
        dto.DisplayedItemName.Should().Be("Item FR");
        dto.DisplayedLocale.Should().Be("fr");
        dto.Quantity.Should().Be(2);
        dto.Notes.Should().Be("no onions");
    }

    [Fact]
    public void ToConfirmationItemDto_FallsBackWhenDisplayedNameMissing()
    {
        var item = new OrderItem
        {
            ItemNameAr = "صنف قديم",
            ItemNameEn = "Legacy Item",
            DisplayedItemName = string.Empty,
            DisplayedLocale = string.Empty,
            UnitPrice = 5m,
            Quantity = 1,
            TotalPrice = 5m
        };

        var dto = OrderItemDisplayProjection.ToConfirmationItemDto(item, "en");

        dto.Should().BeOfType<PublicOrderConfirmationItemDto>();
        dto.DisplayedItemName.Should().Be("صنف قديم");
        dto.DisplayedLocale.Should().Be("en");
        dto.ItemNameAr.Should().Be("صنف قديم");
        dto.ItemNameEn.Should().Be("Legacy Item");
    }
}

using FluentAssertions;
using RestaurantOrdering.Domain.Entities;
using Xunit;

namespace RestaurantOrdering.UnitTests;

public sealed class MenuPricingTests
{
    [Theory]
    [InlineData(null, 0, 1000)]
    [InlineData(MenuDiscountType.Percentage, 20, 800)]
    [InlineData(MenuDiscountType.FixedAmount, 2, 800)]
    [InlineData(MenuDiscountType.SalePrice, 7, 700)]
    [InlineData(MenuDiscountType.Percentage, 100, 0)]
    public void SingleItem_ResolvesConfiguredPrice(MenuDiscountType? type, int value, int finalCents)
    {
        var item = new MenuItem { Price = 10m, Discount = type is { } rule ? new MenuDiscount(rule, value) : null };
        var price = MenuPricing.ForItem(item);
        price.BasePrice.Should().Be(10m);
        price.FinalPrice.Should().Be(finalCents / 100m);
        price.DiscountAmount.Should().Be(10m - finalCents / 100m);
    }

    [Theory]
    [InlineData(MenuDiscountType.Percentage, 101)]
    [InlineData(MenuDiscountType.Percentage, -1)]
    [InlineData(MenuDiscountType.FixedAmount, 11)]
    [InlineData(MenuDiscountType.FixedAmount, -1)]
    [InlineData(MenuDiscountType.SalePrice, 11)]
    [InlineData(MenuDiscountType.SalePrice, -1)]
    [InlineData((MenuDiscountType)99, 0)]
    public void InvalidDiscountsAreRejected(MenuDiscountType type, int value)
    {
        MenuPricing.IsValid(10m, new MenuDiscount(type, value)).Should().BeFalse();
    }

    [Fact]
    public void MoneyRejectsExcessPrecisionAndRoundsFinalPriceHalfUp()
    {
        MenuPricing.IsValid(10m, new MenuDiscount(MenuDiscountType.FixedAmount, 1.001m)).Should().BeFalse();
        MenuPricing.Calculate(2.01m, new MenuDiscount(MenuDiscountType.Percentage, 50m)).FinalPrice.Should().Be(1.01m);
    }

    [Fact]
    public void OnlyOneSizeModeAppliesAndLegacySaleRemainsLimitedToSinglePricing()
    {
        var small = new MenuItemSize(Guid.NewGuid(), "Small", 2.50m, true, 1,
            new MenuDiscount(MenuDiscountType.SalePrice, 0m));
        var large = new MenuItemSize(Guid.NewGuid(), "Large", 4.20m, true, 2);
        var item = new MenuItem { Price = 5m, DiscountPrice = 3m, UsesSizes = true, Sizes = [small, large] };

        MenuPricing.ForSizes(item)![small.Id!.Value].FinalPrice.Should().Be(2.50m);
        item.SizeDiscountMode = SizeDiscountMode.Uniform;
        item.UniformDiscount = new MenuDiscount(MenuDiscountType.Percentage, 10m);
        MenuPricing.ForItem(item, small).FinalPrice.Should().Be(2.25m);
        MenuPricing.ForItem(item, large).FinalPrice.Should().Be(3.78m);
        item.UniformDiscount = new MenuDiscount(MenuDiscountType.FixedAmount, .50m);
        MenuPricing.ForItem(item, small).FinalPrice.Should().Be(2m);
        MenuPricing.ForItem(item, large).FinalPrice.Should().Be(3.70m);
        item.SizeDiscountMode = SizeDiscountMode.Individual;
        MenuPricing.ForItem(item, small).FinalPrice.Should().Be(0m);
        MenuPricing.ForItem(item, large).FinalPrice.Should().Be(4.20m);
        item.UsesSizes = false;
        MenuPricing.ForItem(item).FinalPrice.Should().Be(3m);
    }
}

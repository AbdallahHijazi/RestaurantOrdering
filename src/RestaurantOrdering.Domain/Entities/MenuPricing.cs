namespace RestaurantOrdering.Domain.Entities;

public enum MenuDiscountType { Percentage = 1, FixedAmount = 2, SalePrice = 3 }

public enum SizeDiscountMode { None = 0, Uniform = 1, Individual = 2 }

public sealed record MenuDiscount(MenuDiscountType Type, decimal Value);

public sealed record MenuPrice(decimal BasePrice, decimal FinalPrice, MenuDiscount? Discount)
{
    public decimal DiscountAmount => BasePrice - FinalPrice;
}

public static class MenuPricing
{
    public static bool IsMoney(decimal value) =>
        value is >= 0 and <= 99999999.99m && decimal.Round(value, 2) == value;

    public static bool IsValid(decimal price, MenuDiscount? discount) =>
        IsMoney(price) && (discount is null || (IsMoney(discount.Value) && (discount.Type switch
        {
            MenuDiscountType.Percentage => discount.Value <= 100,
            MenuDiscountType.FixedAmount or MenuDiscountType.SalePrice => discount.Value <= price,
            _ => false
        })));

    public static MenuPrice Calculate(decimal price, MenuDiscount? discount)
    {
        var final = discount?.Type switch
        {
            MenuDiscountType.Percentage => price * (100m - discount.Value) / 100m,
            MenuDiscountType.FixedAmount => price - discount.Value,
            MenuDiscountType.SalePrice => discount.Value,
            _ => price
        };
        return new MenuPrice(price, decimal.Round(final, 2, MidpointRounding.AwayFromZero), discount);
    }

    public static IReadOnlyDictionary<Guid, MenuPrice>? ForSizes(MenuItem item) =>
        item.UsesSizes ? item.Sizes?.Where(size => size.Id.HasValue)
            .ToDictionary(size => size.Id!.Value, size => ForItem(item, size)) : null;

    public static MenuPrice ForItem(MenuItem item, MenuItemSize? size = null)
    {
        if (size is not null)
        {
            var discount = item.SizeDiscountMode switch
            {
                SizeDiscountMode.Uniform => item.UniformDiscount,
                SizeDiscountMode.Individual => size.Discount,
                _ => null
            };
            return Calculate(size.Price, discount);
        }

        return Calculate(item.Price, item.Discount ??
            (item.DiscountPrice is decimal legacy ? new MenuDiscount(MenuDiscountType.SalePrice, legacy) : null));
    }
}

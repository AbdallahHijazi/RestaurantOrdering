using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.MenuItems.Common;

public static class MenuDiscountConfiguration
{
    public static void Apply(MenuItem item, MenuDiscount? discount, SizeDiscountMode? mode, MenuDiscount? uniform)
    {
        if ((item.UsesSizes && discount is not null) ||
            (!item.UsesSizes && (mode.HasValue || uniform is not null)) ||
            (mode != SizeDiscountMode.Uniform && uniform is not null))
        {
            throw new ConflictException("Select a discount configuration that matches the item's pricing mode.");
        }

        if (mode.HasValue)
        {
            item.SizeDiscountMode = mode.Value;
            item.UniformDiscount = uniform;
        }

        if (!item.UsesSizes)
        {
            item.Discount = discount;
            if (discount is not null)
            {
                item.DiscountPrice = null;
            }
        }

        Validate(item);
    }

    public static void Validate(MenuItem item)
    {
        if (!MenuPricing.IsValid(item.Price, item.DiscountPrice is decimal legacy
                ? new MenuDiscount(MenuDiscountType.SalePrice, legacy) : null) ||
            (!item.UsesSizes && !MenuPricing.IsValid(item.Price, item.Discount)))
        {
            throw new ConflictException("Enter a valid price and discount with up to two decimal places.");
        }

        if (!Enum.IsDefined(item.SizeDiscountMode))
        {
            throw new ConflictException("Select a valid size discount mode.");
        }

        if (!item.UsesSizes) return;

        if (item.SizeDiscountMode == SizeDiscountMode.Uniform &&
            (item.UniformDiscount is null || item.UniformDiscount.Type == MenuDiscountType.SalePrice ||
             item.Sizes!.Any(size => !MenuPricing.IsValid(size.Price, item.UniformDiscount))))
        {
            throw new ConflictException("A uniform discount must be a valid percentage or deduction for every size.");
        }

        if (item.SizeDiscountMode == SizeDiscountMode.Individual &&
            item.Sizes!.Any(size => !MenuPricing.IsValid(size.Price, size.Discount)))
        {
            throw new ConflictException("Enter a valid discount for each size.");
        }
    }
}

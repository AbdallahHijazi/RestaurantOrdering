using RestaurantOrdering.Application.Features.MenuItems.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.MenuItems.Common;

public static class MenuItemMappings
{
    public static MenuItemDto ToDto(this MenuItem menuItem) => new()
    {
        Id = menuItem.Id,
        RestaurantId = menuItem.RestaurantId,
        CategoryId = menuItem.CategoryId,
        ImageFileId = menuItem.ImageFileId,
        NameAr = menuItem.NameAr,
        NameEn = menuItem.NameEn,
        DescriptionAr = menuItem.DescriptionAr,
        DescriptionEn = menuItem.DescriptionEn,
        Price = menuItem.Price,
        DiscountPrice = menuItem.DiscountPrice,
        DisplayOrder = menuItem.DisplayOrder,
        IsAvailable = menuItem.IsAvailable,
        IsActive = menuItem.IsActive,
        CreatedAt = menuItem.CreatedAt,
        UpdatedAt = menuItem.UpdatedAt
    };
}

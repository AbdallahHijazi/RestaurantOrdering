using RestaurantOrdering.Application.Features.PublicMenu.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.PublicMenu.Common;

public static class PublicMenuMappings
{
    public static PublicMenuItemDto ToPublicMenuItemDto(this MenuItem menuItem, string? imageUrl = null) => new()
    {
        Id = menuItem.Id,
        CategoryId = menuItem.CategoryId,
        ImageFileId = menuItem.ImageFileId,
        ImageUrl = imageUrl,
        NameAr = menuItem.NameAr,
        NameEn = menuItem.NameEn,
        DescriptionAr = menuItem.DescriptionAr,
        DescriptionEn = menuItem.DescriptionEn,
        Price = menuItem.Price,
        DiscountPrice = menuItem.DiscountPrice,
        DisplayOrder = menuItem.DisplayOrder
    };

    public static PublicMenuCategoryDto ToPublicMenuCategoryDto(
        this Category category,
        IReadOnlyList<PublicMenuItemDto> items) => new()
    {
        Id = category.Id,
        NameAr = category.NameAr,
        NameEn = category.NameEn,
        DescriptionAr = category.DescriptionAr,
        DescriptionEn = category.DescriptionEn,
        DisplayOrder = category.DisplayOrder,
        Items = items
    };
}

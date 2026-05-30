using RestaurantOrdering.Application.Features.Categories.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.Categories.Common;

public static class CategoryMappings
{
    public static CategoryDto ToDto(this Category category) => new()
    {
        Id = category.Id,
        RestaurantId = category.RestaurantId,
        NameAr = category.NameAr,
        NameEn = category.NameEn,
        DescriptionAr = category.DescriptionAr,
        DescriptionEn = category.DescriptionEn,
        DisplayOrder = category.DisplayOrder,
        IsActive = category.IsActive,
        CreatedAt = category.CreatedAt,
        UpdatedAt = category.UpdatedAt
    };
}

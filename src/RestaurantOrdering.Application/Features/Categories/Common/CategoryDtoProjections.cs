using RestaurantOrdering.Application.Features.Categories.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.Categories.Common;

public static class CategoryDtoProjections
{
    public static IQueryable<CategoryDto> ProjectToDto(this IQueryable<Category> categories) =>
        categories.Select(category => new CategoryDto
        {
            Id = category.Id,
            RestaurantId = category.RestaurantId,
            NameAr = category.NameAr,
            NameEn = category.NameEn,
            DescriptionAr = category.DescriptionAr,
            DescriptionEn = category.DescriptionEn,
            DisplayOrder = category.DisplayOrder,
            IsActive = category.IsActive,
            ItemCount = category.MenuItems.Count(),
            CreatedAt = category.CreatedAt,
            UpdatedAt = category.UpdatedAt
        });
}

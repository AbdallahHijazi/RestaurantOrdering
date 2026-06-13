using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.MenuItems.Common;

public static class MenuItemMappings
{
    public static MenuItemDto ToDto(
        this MenuItem menuItem,
        string? imageUrl = null,
        MenuItemTranslation? arTranslation = null,
        MenuItemTranslation? enTranslation = null) => new()
    {
        Id = menuItem.Id,
        RestaurantId = menuItem.RestaurantId,
        CategoryId = menuItem.CategoryId,
        ImageFileId = menuItem.ImageFileId,
        ImageUrl = imageUrl,
        NameAr = PublishedTranslationDualRead.ResolveRequired(
            arTranslation?.Name, arTranslation?.PublishedSourceVersion, menuItem.ContentVersion, menuItem.NameAr),
        NameEn = PublishedTranslationDualRead.ResolveOptional(
            enTranslation?.Name, enTranslation?.PublishedSourceVersion, menuItem.ContentVersion, menuItem.NameEn),
        DescriptionAr = PublishedTranslationDualRead.ResolveOptional(
            arTranslation?.Description, arTranslation?.PublishedSourceVersion, menuItem.ContentVersion, menuItem.DescriptionAr),
        DescriptionEn = PublishedTranslationDualRead.ResolveOptional(
            enTranslation?.Description, enTranslation?.PublishedSourceVersion, menuItem.ContentVersion, menuItem.DescriptionEn),
        Price = menuItem.Price,
        DiscountPrice = menuItem.DiscountPrice,
        DisplayOrder = menuItem.DisplayOrder,
        IsAvailable = menuItem.IsAvailable,
        IsActive = menuItem.IsActive,
        CreatedAt = menuItem.CreatedAt,
        UpdatedAt = menuItem.UpdatedAt
    };
}

using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.PublicMenu.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.PublicMenu.Common;

public static class PublicMenuMappings
{
    public static PublicMenuItemDto ToPublicMenuItemDto(
        this MenuItem menuItem,
        string? imageUrl = null,
        MenuItemTranslation? arTranslation = null,
        MenuItemTranslation? enTranslation = null,
        PublicLocalizedContent? localizedContent = null)
    {
        localizedContent ??= new PublicLocalizedContent(
            menuItem.NameAr,
            menuItem.DescriptionAr,
            Address: null,
            ResolvedLocale: "ar",
            FallbackApplied: false);

        return new PublicMenuItemDto
        {
            Id = menuItem.Id,
            CategoryId = menuItem.CategoryId,
            ImageFileId = menuItem.ImageFileId,
            ImageUrl = imageUrl,
            NameAr = PublishedTranslationDualRead.ResolveRequired(
                arTranslation?.Name,
                arTranslation?.PublishedSourceVersion,
                menuItem.ContentVersion,
                menuItem.NameAr),
            NameEn = PublishedTranslationDualRead.ResolveOptional(
                enTranslation?.Name,
                enTranslation?.PublishedSourceVersion,
                menuItem.ContentVersion,
                menuItem.NameEn),
            DescriptionAr = PublishedTranslationDualRead.ResolveOptional(
                arTranslation?.Description,
                arTranslation?.PublishedSourceVersion,
                menuItem.ContentVersion,
                menuItem.DescriptionAr),
            DescriptionEn = PublishedTranslationDualRead.ResolveOptional(
                enTranslation?.Description,
                enTranslation?.PublishedSourceVersion,
                menuItem.ContentVersion,
                menuItem.DescriptionEn),
            Price = menuItem.Price,
            DiscountPrice = menuItem.DiscountPrice,
            DisplayOrder = menuItem.DisplayOrder,
            Name = localizedContent.Name,
            Description = localizedContent.Description,
            ResolvedLocale = localizedContent.ResolvedLocale,
            FallbackApplied = localizedContent.FallbackApplied
        };
    }

    public static PublicMenuCategoryDto ToPublicMenuCategoryDto(
        this Category category,
        IReadOnlyList<PublicMenuItemDto> items,
        CategoryTranslation? arTranslation = null,
        CategoryTranslation? enTranslation = null,
        PublicLocalizedContent? localizedContent = null)
    {
        localizedContent ??= new PublicLocalizedContent(
            category.NameAr,
            category.DescriptionAr,
            Address: null,
            ResolvedLocale: "ar",
            FallbackApplied: false);

        return new PublicMenuCategoryDto
        {
            Id = category.Id,
            NameAr = PublishedTranslationDualRead.ResolveRequired(
                arTranslation?.Name,
                arTranslation?.PublishedSourceVersion,
                category.ContentVersion,
                category.NameAr),
            NameEn = PublishedTranslationDualRead.ResolveOptional(
                enTranslation?.Name,
                enTranslation?.PublishedSourceVersion,
                category.ContentVersion,
                category.NameEn),
            DescriptionAr = PublishedTranslationDualRead.ResolveOptional(
                arTranslation?.Description,
                arTranslation?.PublishedSourceVersion,
                category.ContentVersion,
                category.DescriptionAr),
            DescriptionEn = PublishedTranslationDualRead.ResolveOptional(
                enTranslation?.Description,
                enTranslation?.PublishedSourceVersion,
                category.ContentVersion,
                category.DescriptionEn),
            DisplayOrder = category.DisplayOrder,
            Items = items,
            Name = localizedContent.Name,
            Description = localizedContent.Description,
            ResolvedLocale = localizedContent.ResolvedLocale,
            FallbackApplied = localizedContent.FallbackApplied
        };
    }
}

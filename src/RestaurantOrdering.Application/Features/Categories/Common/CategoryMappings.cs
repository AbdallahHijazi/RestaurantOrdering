using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.Categories.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.Categories.Common;

public static class CategoryMappings
{
    public static CategoryDto ToDto(
        this Category category,
        int itemCount = 0,
        CategoryTranslation? arTranslation = null,
        CategoryTranslation? enTranslation = null,
        PublicLocalizedContent? primaryContent = null) => new()
    {
        Id = category.Id,
        RestaurantId = category.RestaurantId,
        NameAr = PublishedTranslationDualRead.ResolveRequired(
            arTranslation?.Name, arTranslation?.PublishedSourceVersion, category.ContentVersion, category.NameAr),
        NameEn = PublishedTranslationDualRead.ResolveOptional(
            enTranslation?.Name, enTranslation?.PublishedSourceVersion, category.ContentVersion, category.NameEn),
        DescriptionAr = PublishedTranslationDualRead.ResolveOptional(
            arTranslation?.Description, arTranslation?.PublishedSourceVersion, category.ContentVersion, category.DescriptionAr),
        DescriptionEn = PublishedTranslationDualRead.ResolveOptional(
            enTranslation?.Description, enTranslation?.PublishedSourceVersion, category.ContentVersion, category.DescriptionEn),
        DisplayOrder = category.DisplayOrder,
        IsActive = category.IsActive,
        ItemCount = itemCount,
        CreatedAt = category.CreatedAt,
        UpdatedAt = category.UpdatedAt,
        PrimaryName = primaryContent?.Name,
        PrimaryDescription = primaryContent?.Description,
        PrimaryLocale = primaryContent?.ResolvedLocale,
        PrimaryFallbackApplied = primaryContent?.FallbackApplied ?? false
    };
}

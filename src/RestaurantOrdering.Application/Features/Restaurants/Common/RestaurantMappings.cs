using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.Restaurants.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.Restaurants.Common;

public static class RestaurantMappings
{
    public static RestaurantDto ToDto(
        this Restaurant restaurant,
        string? logoUrl = null,
        string? coverImageUrl = null,
        RestaurantTranslation? arTranslation = null,
        RestaurantTranslation? enTranslation = null) => new()
    {
        Id = restaurant.Id,
        OwnerId = restaurant.OwnerId,
        Slug = restaurant.Slug,
        NameAr = PublishedTranslationDualRead.ResolveRequired(
            arTranslation?.Name, arTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.NameAr),
        NameEn = PublishedTranslationDualRead.ResolveOptional(
            enTranslation?.Name, enTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.NameEn),
        DescriptionAr = PublishedTranslationDualRead.ResolveOptional(
            arTranslation?.Description, arTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.DescriptionAr),
        DescriptionEn = PublishedTranslationDualRead.ResolveOptional(
            enTranslation?.Description, enTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.DescriptionEn),
        LogoFileId = restaurant.LogoFileId,
        LogoUrl = logoUrl,
        CoverImageFileId = restaurant.CoverImageFileId,
        CoverImageUrl = coverImageUrl,
        AccentColor = restaurant.AccentColor,
        PhoneNumber = restaurant.PhoneNumber,
        WhatsAppNumber = restaurant.WhatsAppNumber,
        AddressAr = PublishedTranslationDualRead.ResolveOptional(
            arTranslation?.Address, arTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.AddressAr),
        AddressEn = PublishedTranslationDualRead.ResolveOptional(
            enTranslation?.Address, enTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.AddressEn),
        Latitude = restaurant.Latitude,
        Longitude = restaurant.Longitude,
        IsActive = restaurant.IsActive,
        CreatedAt = restaurant.CreatedAt,
        UpdatedAt = restaurant.UpdatedAt
    };

    public static PublicRestaurantDto ToPublicDto(
        this Restaurant restaurant,
        string? logoUrl = null,
        string? coverImageUrl = null,
        RestaurantTranslation? arTranslation = null,
        RestaurantTranslation? enTranslation = null) => new()
    {
        Id = restaurant.Id,
        Slug = restaurant.Slug,
        NameAr = PublishedTranslationDualRead.ResolveRequired(
            arTranslation?.Name, arTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.NameAr),
        NameEn = PublishedTranslationDualRead.ResolveOptional(
            enTranslation?.Name, enTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.NameEn),
        DescriptionAr = PublishedTranslationDualRead.ResolveOptional(
            arTranslation?.Description, arTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.DescriptionAr),
        DescriptionEn = PublishedTranslationDualRead.ResolveOptional(
            enTranslation?.Description, enTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.DescriptionEn),
        LogoFileId = restaurant.LogoFileId,
        LogoUrl = logoUrl,
        CoverImageUrl = coverImageUrl,
        AccentColor = restaurant.AccentColor,
        PhoneNumber = restaurant.PhoneNumber,
        WhatsAppNumber = restaurant.WhatsAppNumber,
        AddressAr = PublishedTranslationDualRead.ResolveOptional(
            arTranslation?.Address, arTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.AddressAr),
        AddressEn = PublishedTranslationDualRead.ResolveOptional(
            enTranslation?.Address, enTranslation?.PublishedSourceVersion, restaurant.ContentVersion, restaurant.AddressEn),
        Latitude = restaurant.Latitude,
        Longitude = restaurant.Longitude
    };
}

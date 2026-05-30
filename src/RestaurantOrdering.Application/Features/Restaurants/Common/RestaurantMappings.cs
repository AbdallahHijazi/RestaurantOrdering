using RestaurantOrdering.Application.Features.Restaurants.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.Restaurants.Common;

public static class RestaurantMappings
{
    public static RestaurantDto ToDto(this Restaurant restaurant) => new()
    {
        Id = restaurant.Id,
        OwnerId = restaurant.OwnerId,
        Slug = restaurant.Slug,
        NameAr = restaurant.NameAr,
        NameEn = restaurant.NameEn,
        DescriptionAr = restaurant.DescriptionAr,
        DescriptionEn = restaurant.DescriptionEn,
        LogoFileId = restaurant.LogoFileId,
        PhoneNumber = restaurant.PhoneNumber,
        WhatsAppNumber = restaurant.WhatsAppNumber,
        AddressAr = restaurant.AddressAr,
        AddressEn = restaurant.AddressEn,
        Latitude = restaurant.Latitude,
        Longitude = restaurant.Longitude,
        IsActive = restaurant.IsActive,
        CreatedAt = restaurant.CreatedAt,
        UpdatedAt = restaurant.UpdatedAt
    };

    public static PublicRestaurantDto ToPublicDto(this Restaurant restaurant) => new()
    {
        Id = restaurant.Id,
        Slug = restaurant.Slug,
        NameAr = restaurant.NameAr,
        NameEn = restaurant.NameEn,
        DescriptionAr = restaurant.DescriptionAr,
        DescriptionEn = restaurant.DescriptionEn,
        LogoFileId = restaurant.LogoFileId,
        PhoneNumber = restaurant.PhoneNumber,
        WhatsAppNumber = restaurant.WhatsAppNumber,
        AddressAr = restaurant.AddressAr,
        AddressEn = restaurant.AddressEn,
        Latitude = restaurant.Latitude,
        Longitude = restaurant.Longitude
    };
}

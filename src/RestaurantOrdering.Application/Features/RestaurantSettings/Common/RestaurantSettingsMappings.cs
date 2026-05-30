using RestaurantOrdering.Application.Features.RestaurantSettings.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.RestaurantSettings.Common;

public static class RestaurantSettingsMappings
{
    public static RestaurantSettingsDto ToDto(this Domain.Entities.RestaurantSettings settings) => new()
    {
        Id = settings.Id,
        RestaurantId = settings.RestaurantId,
        CurrencyCode = settings.CurrencyCode,
        TimeZone = settings.TimeZone,
        TaxRate = settings.TaxRate,
        DeliveryFee = settings.DeliveryFee,
        MinimumOrderAmount = settings.MinimumOrderAmount,
        IsDeliveryEnabled = settings.IsDeliveryEnabled,
        IsPickupEnabled = settings.IsPickupEnabled,
        WorkingHoursJson = settings.WorkingHoursJson,
        CreatedAt = settings.CreatedAt,
        UpdatedAt = settings.UpdatedAt
    };
}

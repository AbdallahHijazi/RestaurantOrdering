using MediatR;
using RestaurantOrdering.Application.Features.RestaurantSettings.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantSettings.Commands.UpdateRestaurantSettings;

public sealed record UpdateRestaurantSettingsCommand(
    Guid RestaurantId,
    string CurrencyCode,
    string TimeZone,
    decimal TaxRate,
    decimal DeliveryFee,
    decimal MinimumOrderAmount,
    bool IsDeliveryEnabled,
    bool IsPickupEnabled,
    string? WorkingHoursJson) : IRequest<RestaurantSettingsDto>;

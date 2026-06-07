using MediatR;
using RestaurantOrdering.Application.Features.Orders.DTOs;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Orders.Commands.CreatePublicOrder;

public sealed record CreatePublicOrderCommand(
    string RestaurantSlug,
    string GuestName,
    string GuestPhone,
    OrderType OrderType,
    string? TableToken,
    string? DeliveryAddress,
    decimal? DeliveryLatitude,
    decimal? DeliveryLongitude,
    string? Notes,
    IReadOnlyList<CreatePublicOrderItemRequest> Items) : IRequest<PublicOrderConfirmationDto>;

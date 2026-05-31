using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Orders.DTOs;

public class OrderDetailsDto
{
    public Guid Id { get; init; }
    public string OrderNumber { get; init; } = string.Empty;
    public Guid RestaurantId { get; init; }
    public Guid? CustomerId { get; init; }
    public string? GuestName { get; init; }
    public string? GuestPhone { get; init; }
    public OrderType OrderType { get; init; }
    public OrderStatus OrderStatus { get; init; }
    public string? DeliveryAddress { get; init; }
    public decimal? DeliveryLatitude { get; init; }
    public decimal? DeliveryLongitude { get; init; }
    public decimal Subtotal { get; init; }
    public decimal DiscountAmount { get; init; }
    public decimal TaxAmount { get; init; }
    public decimal DeliveryFee { get; init; }
    public decimal TotalAmount { get; init; }
    public string CurrencyCode { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public IReadOnlyList<OrderDetailsItemDto> Items { get; init; } =
        Array.Empty<OrderDetailsItemDto>();
}

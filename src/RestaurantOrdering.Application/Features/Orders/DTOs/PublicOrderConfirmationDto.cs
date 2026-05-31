using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Orders.DTOs;

public class PublicOrderConfirmationDto
{
    public Guid OrderId { get; init; }
    public string OrderNumber { get; init; } = string.Empty;
    public OrderType OrderType { get; init; }
    public OrderStatus OrderStatus { get; init; }
    public decimal Subtotal { get; init; }
    public decimal DiscountAmount { get; init; }
    public decimal TaxAmount { get; init; }
    public decimal DeliveryFee { get; init; }
    public decimal TotalAmount { get; init; }
    public string CurrencyCode { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public IReadOnlyList<PublicOrderConfirmationItemDto> Items { get; init; } =
        Array.Empty<PublicOrderConfirmationItemDto>();
}

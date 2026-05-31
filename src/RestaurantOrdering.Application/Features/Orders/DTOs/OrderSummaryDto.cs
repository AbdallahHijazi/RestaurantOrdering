using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Orders.DTOs;

public class OrderSummaryDto
{
    public Guid Id { get; init; }
    public string OrderNumber { get; init; } = string.Empty;
    public Guid RestaurantId { get; init; }
    public Guid? CustomerId { get; init; }
    public string? GuestName { get; init; }
    public string? GuestPhone { get; init; }
    public OrderType OrderType { get; init; }
    public OrderStatus OrderStatus { get; init; }
    public decimal TotalAmount { get; init; }
    public string CurrencyCode { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

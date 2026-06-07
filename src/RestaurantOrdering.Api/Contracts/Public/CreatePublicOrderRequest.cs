using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Api.Contracts.Public;

public sealed class CreatePublicOrderRequest
{
    public string GuestName { get; init; } = string.Empty;
    public string GuestPhone { get; init; } = string.Empty;
    public OrderType OrderType { get; init; }
    public string? TableToken { get; init; }
    public string? DeliveryAddress { get; init; }
    public decimal? DeliveryLatitude { get; init; }
    public decimal? DeliveryLongitude { get; init; }
    public string? Notes { get; init; }
    public IReadOnlyList<CreatePublicOrderItemRequest> Items { get; init; } =
        Array.Empty<CreatePublicOrderItemRequest>();
}

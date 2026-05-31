using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Api.Contracts.Admin.Orders;

public sealed class UpdateOrderStatusRequest
{
    public OrderStatus NewStatus { get; init; }
}

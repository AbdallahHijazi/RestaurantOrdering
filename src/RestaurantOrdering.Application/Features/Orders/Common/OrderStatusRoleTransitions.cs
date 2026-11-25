using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Orders.Common;

public static class OrderStatusRoleTransitions
{
    public static bool CanKitchenManagerTransition(OrderStatus currentStatus, OrderStatus newStatus) =>
        currentStatus switch
        {
            OrderStatus.New when newStatus == OrderStatus.Preparing => true,
            OrderStatus.Preparing when newStatus == OrderStatus.Ready => true,
            _ => false
        };
}

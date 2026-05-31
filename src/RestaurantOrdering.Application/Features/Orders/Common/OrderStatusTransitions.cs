using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Orders.Common;

public static class OrderStatusTransitions
{
    public static bool CanTransition(OrderStatus currentStatus, OrderStatus newStatus)
    {
        if (currentStatus == newStatus)
        {
            return false;
        }

        return currentStatus switch
        {
            OrderStatus.New => newStatus is OrderStatus.Preparing or OrderStatus.Cancelled,
            OrderStatus.Preparing => newStatus is OrderStatus.Ready or OrderStatus.Cancelled,
            OrderStatus.Ready => newStatus is OrderStatus.Completed or OrderStatus.Cancelled,
            OrderStatus.Completed => false,
            OrderStatus.Cancelled => false,
            _ => false
        };
    }
}

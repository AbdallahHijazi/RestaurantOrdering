using MediatR;
using RestaurantOrdering.Application.Features.Orders.DTOs;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Orders.Commands.UpdateOrderStatus;

public sealed record UpdateOrderStatusCommand(
    Guid RestaurantId,
    Guid OrderId,
    OrderStatus NewStatus) : IRequest<OrderSummaryDto>;

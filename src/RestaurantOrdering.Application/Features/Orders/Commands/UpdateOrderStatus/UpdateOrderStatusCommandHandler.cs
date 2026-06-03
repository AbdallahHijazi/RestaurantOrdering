using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Orders.Common;
using RestaurantOrdering.Application.Features.Orders.DTOs;

namespace RestaurantOrdering.Application.Features.Orders.Commands.UpdateOrderStatus;

public sealed class UpdateOrderStatusCommandHandler
    : IRequestHandler<UpdateOrderStatusCommand, OrderSummaryDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;
    private readonly ICurrentRequestDashboardAccess _currentRequestDashboardAccess;

    public UpdateOrderStatusCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService,
        ICurrentRequestDashboardAccess currentRequestDashboardAccess)
    {
        _context = context;
        _dateTimeService = dateTimeService;
        _currentRequestDashboardAccess = currentRequestDashboardAccess;
    }

    public async Task<OrderSummaryDto> Handle(
        UpdateOrderStatusCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .SingleOrDefaultAsync(
                o => o.Id == request.OrderId && o.RestaurantId == request.RestaurantId,
                cancellationToken);

        if (order is null)
        {
            throw new NotFoundException("Order", request.OrderId);
        }

        if (!OrderStatusTransitions.CanTransition(order.OrderStatus, request.NewStatus))
        {
            throw new ConflictException(
                $"Order status transition from '{order.OrderStatus}' to '{request.NewStatus}' is not allowed.");
        }

        var accessContext = _currentRequestDashboardAccess.Context
            ?? throw new InvalidOperationException("Dashboard access context is not available.");

        if (!accessContext.HasFullOrderStatusControl
            && !OrderStatusRoleTransitions.CanKitchenManagerTransition(
                order.OrderStatus,
                request.NewStatus))
        {
            throw new ForbiddenException(
                $"Order status transition from '{order.OrderStatus}' to '{request.NewStatus}' is not allowed for the current role.");
        }

        order.OrderStatus = request.NewStatus;
        order.UpdatedAt = _dateTimeService.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return new OrderSummaryDto
        {
            Id = order.Id,
            OrderNumber = order.OrderNumber,
            RestaurantId = order.RestaurantId,
            CustomerId = order.CustomerId,
            GuestName = order.GuestName,
            GuestPhone = order.GuestPhone,
            OrderType = order.OrderType,
            OrderStatus = order.OrderStatus,
            TotalAmount = order.TotalAmount,
            CurrencyCode = order.CurrencyCode,
            CreatedAt = order.CreatedAt,
            UpdatedAt = order.UpdatedAt
        };
    }
}

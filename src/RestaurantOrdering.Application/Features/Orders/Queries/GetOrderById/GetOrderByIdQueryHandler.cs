using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.Orders.DTOs;

namespace RestaurantOrdering.Application.Features.Orders.Queries.GetOrderById;

public sealed class GetOrderByIdQueryHandler
    : IRequestHandler<GetOrderByIdQuery, OrderDetailsDto>
{
    private readonly IApplicationDbContext _context;

    public GetOrderByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<OrderDetailsDto> Handle(
        GetOrderByIdQuery request,
        CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .AsNoTracking()
            .Where(o => o.RestaurantId == request.RestaurantId && o.Id == request.OrderId)
            .Select(o => new OrderDetailsDto
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber,
                RestaurantId = o.RestaurantId,
                CustomerId = o.CustomerId,
                GuestName = o.GuestName,
                GuestPhone = o.GuestPhone,
                OrderType = o.OrderType,
                OrderStatus = o.OrderStatus,
                DeliveryAddress = o.DeliveryAddress,
                DeliveryLatitude = o.DeliveryLatitude,
                DeliveryLongitude = o.DeliveryLongitude,
                Subtotal = o.Subtotal,
                DiscountAmount = o.DiscountAmount,
                TaxAmount = o.TaxAmount,
                DeliveryFee = o.DeliveryFee,
                TotalAmount = o.TotalAmount,
                CurrencyCode = o.CurrencyCode,
                Notes = o.Notes,
                CreatedAt = o.CreatedAt,
                UpdatedAt = o.UpdatedAt,
                Items = o.OrderItems
                    .OrderBy(item => item.CreatedAt)
                    .ThenBy(item => item.Id)
                    .Select(item => new OrderDetailsItemDto
                    {
                        Id = item.Id,
                        MenuItemId = item.MenuItemId,
                        ItemNameAr = item.ItemNameAr,
                        ItemNameEn = item.ItemNameEn,
                        UnitPrice = item.UnitPrice,
                        Quantity = item.Quantity,
                        TotalPrice = item.TotalPrice,
                        Notes = item.Notes
                    })
                    .ToList()
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (order is null)
        {
            throw new NotFoundException("Order", request.OrderId);
        }

        return order;
    }
}

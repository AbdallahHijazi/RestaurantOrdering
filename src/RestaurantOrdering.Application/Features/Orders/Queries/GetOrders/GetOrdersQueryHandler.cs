using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.Orders.DTOs;

namespace RestaurantOrdering.Application.Features.Orders.Queries.GetOrders;

public sealed class GetOrdersQueryHandler
    : IRequestHandler<GetOrdersQuery, GetOrdersResultDto>
{
    private readonly IApplicationDbContext _context;

    public GetOrdersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<GetOrdersResultDto> Handle(
        GetOrdersQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Orders
            .AsNoTracking()
            .Where(order => order.RestaurantId == request.RestaurantId);

        if (request.Status.HasValue)
        {
            query = query.Where(order => order.OrderStatus == request.Status.Value);
        }

        if (request.OrderType.HasValue)
        {
            query = query.Where(order => order.OrderType == request.OrderType.Value);
        }

        if (request.FromUtc.HasValue)
        {
            query = query.Where(order => order.CreatedAt >= request.FromUtc.Value);
        }

        if (request.ToUtc.HasValue)
        {
            query = query.Where(order => order.CreatedAt < request.ToUtc.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.Trim();

            query = query.Where(order =>
                order.OrderNumber.Contains(searchTerm) ||
                (order.GuestName != null && order.GuestName.Contains(searchTerm)) ||
                (order.GuestPhone != null && order.GuestPhone.Contains(searchTerm)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(order => order.CreatedAt)
            .ThenByDescending(order => order.OrderNumber)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(order => new OrderSummaryDto
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
            })
            .ToListAsync(cancellationToken);

        return new GetOrdersResultDto
        {
            Items = items.AsReadOnly(),
            TotalCount = totalCount,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }
}

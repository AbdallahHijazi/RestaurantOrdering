using MediatR;
using RestaurantOrdering.Application.Features.Orders.DTOs;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Orders.Queries.GetOrders;

public sealed record GetOrdersQuery(
    Guid RestaurantId,
    OrderStatus? Status = null,
    OrderType? OrderType = null,
    DateTime? FromUtc = null,
    DateTime? ToUtc = null,
    string? SearchTerm = null,
    int PageNumber = 1,
    int PageSize = 20) : IRequest<GetOrdersResultDto>;

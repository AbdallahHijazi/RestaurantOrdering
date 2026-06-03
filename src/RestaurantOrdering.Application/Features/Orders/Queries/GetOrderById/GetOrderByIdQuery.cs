using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Orders.DTOs;

namespace RestaurantOrdering.Application.Features.Orders.Queries.GetOrderById;

public sealed record GetOrderByIdQuery(Guid RestaurantId, Guid OrderId)
    : IRequest<OrderDetailsDto>, IRestaurantDashboardScopedRequest;

using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Orders.DTOs;

namespace RestaurantOrdering.Application.Features.Orders.Queries.GetDashboardActivity;

public sealed record GetDashboardActivityQuery(Guid RestaurantId, int Days = 7)
    : IRequest<DashboardActivityDto>, IRestaurantDashboardScopedRequest;

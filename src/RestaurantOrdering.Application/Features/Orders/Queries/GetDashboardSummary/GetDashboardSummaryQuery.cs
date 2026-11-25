using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Orders.DTOs;

namespace RestaurantOrdering.Application.Features.Orders.Queries.GetDashboardSummary;

public sealed record GetDashboardSummaryQuery(Guid RestaurantId)
    : IRequest<DashboardSummaryDto>, IRestaurantDashboardScopedRequest;

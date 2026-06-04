using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;

namespace RestaurantOrdering.Application.Features.MenuItems.Queries.GetMenuItems;

public sealed record GetMenuItemsQuery(Guid RestaurantId, Guid? CategoryId = null)
    : IRequest<IReadOnlyList<MenuItemDto>>, IRestaurantDashboardScopedRequest;

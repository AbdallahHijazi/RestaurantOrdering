using MediatR;
using RestaurantOrdering.Application.Common.Security;

namespace RestaurantOrdering.Application.Features.MenuItems.Commands.DeleteMenuItem;

public sealed record DeleteMenuItemCommand(Guid MenuItemId, Guid RestaurantId)
    : IRequest<Unit>, IRestaurantDashboardScopedRequest;

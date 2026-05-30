using MediatR;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;

namespace RestaurantOrdering.Application.Features.MenuItems.Queries.GetMenuItemById;

public sealed record GetMenuItemByIdQuery(Guid MenuItemId, Guid RestaurantId) : IRequest<MenuItemDto>;

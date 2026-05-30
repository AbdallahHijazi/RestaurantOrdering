using MediatR;

namespace RestaurantOrdering.Application.Features.MenuItems.Commands.DeleteMenuItem;

public sealed record DeleteMenuItemCommand(Guid MenuItemId, Guid RestaurantId) : IRequest<Unit>;

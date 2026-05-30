using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.MenuItems.Common;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;

namespace RestaurantOrdering.Application.Features.MenuItems.Queries.GetMenuItemById;

public sealed class GetMenuItemByIdQueryHandler
    : IRequestHandler<GetMenuItemByIdQuery, MenuItemDto>
{
    private readonly IApplicationDbContext _context;

    public GetMenuItemByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<MenuItemDto> Handle(
        GetMenuItemByIdQuery request,
        CancellationToken cancellationToken)
    {
        var menuItem = await _context.MenuItems
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.Id == request.MenuItemId && item.RestaurantId == request.RestaurantId,
                cancellationToken);

        if (menuItem is null)
        {
            throw new NotFoundException("MenuItem", request.MenuItemId);
        }

        return menuItem.ToDto();
    }
}

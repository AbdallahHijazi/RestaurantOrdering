using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.MenuItems.Common;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;

namespace RestaurantOrdering.Application.Features.MenuItems.Queries.GetMenuItems;

public sealed class GetMenuItemsQueryHandler
    : IRequestHandler<GetMenuItemsQuery, IReadOnlyList<MenuItemDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMenuItemsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<MenuItemDto>> Handle(
        GetMenuItemsQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.MenuItems
            .AsNoTracking()
            .Where(item => item.RestaurantId == request.RestaurantId);

        if (request.CategoryId.HasValue)
        {
            query = query.Where(item => item.CategoryId == request.CategoryId.Value);
        }

        var menuItems = await query
            .OrderBy(item => item.DisplayOrder)
            .ThenBy(item => item.NameAr)
            .ToListAsync(cancellationToken);

        return menuItems
            .Select(item => item.ToDto())
            .ToList()
            .AsReadOnly();
    }
}

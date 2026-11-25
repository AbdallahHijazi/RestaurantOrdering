using MediatR;
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
        CancellationToken cancellationToken) =>
        await MenuItemDtoProjections.GetProjectedDtoByIdAsync(
            _context,
            request.MenuItemId,
            request.RestaurantId,
            cancellationToken);
}

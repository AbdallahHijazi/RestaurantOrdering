using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.PublicTables.DTOs;
using RestaurantOrdering.Application.Features.RestaurantTables.Common;
using RestaurantOrdering.Application.Features.Restaurants.Common;

namespace RestaurantOrdering.Application.Features.PublicTables.Queries.ResolvePublicTable;

public sealed class ResolvePublicTableQueryHandler
    : IRequestHandler<ResolvePublicTableQuery, ResolvedPublicTableDto>
{
    private readonly IApplicationDbContext _context;

    public ResolvePublicTableQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ResolvedPublicTableDto> Handle(
        ResolvePublicTableQuery request,
        CancellationToken cancellationToken)
    {
        var normalizedSlug = SlugNormalizer.Normalize(request.RestaurantSlug);

        var restaurant = await _context.Restaurants
            .AsNoTracking()
            .FirstOrDefaultAsync(
                r => r.Slug == normalizedSlug && r.IsActive,
                cancellationToken);

        if (restaurant is null)
        {
            throw new NotFoundException("Restaurant", normalizedSlug);
        }

        var table = await RestaurantTableTokenService.ResolveActiveTableAsync(
            _context,
            restaurant.Id,
            request.Token,
            cancellationToken);

        return new ResolvedPublicTableDto
        {
            TableId = table.Id,
            TableName = table.Name,
            Zone = table.Zone,
            RestaurantId = restaurant.Id
        };
    }
}

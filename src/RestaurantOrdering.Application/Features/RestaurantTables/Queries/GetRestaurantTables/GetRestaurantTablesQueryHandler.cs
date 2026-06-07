using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.RestaurantTables.Common;
using RestaurantOrdering.Application.Features.RestaurantTables.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Queries.GetRestaurantTables;

public sealed class GetRestaurantTablesQueryHandler
    : IRequestHandler<GetRestaurantTablesQuery, IReadOnlyList<RestaurantTableDto>>
{
    private readonly IApplicationDbContext _context;

    public GetRestaurantTablesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<RestaurantTableDto>> Handle(
        GetRestaurantTablesQuery request,
        CancellationToken cancellationToken)
    {
        var tables = await _context.RestaurantTables
            .AsNoTracking()
            .Where(t => t.RestaurantId == request.RestaurantId)
            .OrderBy(t => t.Name)
            .ToListAsync(cancellationToken);

        return tables.Select(t => t.ToDto()).ToList().AsReadOnly();
    }
}

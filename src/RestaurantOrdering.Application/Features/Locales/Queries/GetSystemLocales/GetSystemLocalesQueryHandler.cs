using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.Locales.Common;
using RestaurantOrdering.Application.Features.Locales.DTOs;

namespace RestaurantOrdering.Application.Features.Locales.Queries.GetSystemLocales;

public sealed class GetSystemLocalesQueryHandler
    : IRequestHandler<GetSystemLocalesQuery, IReadOnlyList<SystemLocaleDto>>
{
    private readonly IApplicationDbContext _context;

    public GetSystemLocalesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<SystemLocaleDto>> Handle(
        GetSystemLocalesQuery request,
        CancellationToken cancellationToken)
    {
        var locales = await _context.LocaleDefinitions
            .AsNoTracking()
            .Where(locale => locale.IsEnabled)
            .OrderBy(locale => locale.SortOrder)
            .ThenBy(locale => locale.Code)
            .ToListAsync(cancellationToken);

        return locales.Select(locale => locale.ToSystemDto()).ToList();
    }
}

using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.RestaurantSettings.Common;
using RestaurantOrdering.Application.Features.RestaurantSettings.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantSettings.Queries.GetRestaurantSettings;

public sealed class GetRestaurantSettingsQueryHandler
    : IRequestHandler<GetRestaurantSettingsQuery, RestaurantSettingsDto>
{
    private readonly IApplicationDbContext _context;

    public GetRestaurantSettingsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RestaurantSettingsDto> Handle(
        GetRestaurantSettingsQuery request,
        CancellationToken cancellationToken)
    {
        var settings = await _context.RestaurantSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RestaurantId == request.RestaurantId, cancellationToken);

        if (settings is null)
        {
            throw new NotFoundException("RestaurantSettings", request.RestaurantId);
        }

        return settings.ToDto();
    }
}

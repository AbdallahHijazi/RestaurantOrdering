using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.RestaurantTables.Common;
using RestaurantOrdering.Application.Features.RestaurantTables.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Commands.RegenerateRestaurantTableToken;

public sealed class RegenerateRestaurantTableTokenCommandHandler
    : IRequestHandler<RegenerateRestaurantTableTokenCommand, RestaurantTableDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public RegenerateRestaurantTableTokenCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<RestaurantTableDto> Handle(
        RegenerateRestaurantTableTokenCommand request,
        CancellationToken cancellationToken)
    {
        var table = await _context.RestaurantTables
            .FirstOrDefaultAsync(
                t => t.Id == request.TableId && t.RestaurantId == request.RestaurantId,
                cancellationToken);

        if (table is null)
        {
            throw new NotFoundException("RestaurantTable", request.TableId);
        }

        table.PublicToken = await RestaurantTableTokenService.GenerateUniqueTokenAsync(
            _context,
            cancellationToken);
        table.UpdatedAt = _dateTimeService.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return table.ToDto();
    }
}

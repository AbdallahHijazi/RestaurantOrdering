using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.RestaurantTables.Common;
using RestaurantOrdering.Application.Features.RestaurantTables.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Commands.ArchiveRestaurantTable;

public sealed class ArchiveRestaurantTableCommandHandler
    : IRequestHandler<ArchiveRestaurantTableCommand, RestaurantTableDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public ArchiveRestaurantTableCommandHandler(IApplicationDbContext context, IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<RestaurantTableDto> Handle(
        ArchiveRestaurantTableCommand request,
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

        var now = _dateTimeService.UtcNow;

        if (request.IsArchived && !table.IsArchived)
        {
            table.IsArchived = true;
            table.ArchivedAt = now;
            // An archived table never accepts QR orders; the QR token stays reserved so it can never be reused.
            table.IsActive = false;
            table.UpdatedAt = now;
        }
        else if (!request.IsArchived && table.IsArchived)
        {
            // Restoring keeps the table inactive until the owner re-enables it deliberately.
            table.IsArchived = false;
            table.ArchivedAt = null;
            table.UpdatedAt = now;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return table.ToDto();
    }
}

using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.RestaurantTables.Common;
using RestaurantOrdering.Application.Features.RestaurantTables.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Commands.UpdateRestaurantTable;

public sealed class UpdateRestaurantTableCommandHandler
    : IRequestHandler<UpdateRestaurantTableCommand, RestaurantTableDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public UpdateRestaurantTableCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<RestaurantTableDto> Handle(
        UpdateRestaurantTableCommand request,
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

        table.Name = request.Name.Trim();
        table.Zone = TrimToOptional(request.Zone);
        table.UpdatedAt = _dateTimeService.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return table.ToDto();
    }

    private static string? TrimToOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

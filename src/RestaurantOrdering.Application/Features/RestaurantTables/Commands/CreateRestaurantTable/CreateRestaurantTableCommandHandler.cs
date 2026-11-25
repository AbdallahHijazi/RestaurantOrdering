using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.RestaurantTables.Common;
using RestaurantOrdering.Application.Features.RestaurantTables.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Commands.CreateRestaurantTable;

public sealed class CreateRestaurantTableCommandHandler
    : IRequestHandler<CreateRestaurantTableCommand, RestaurantTableDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public CreateRestaurantTableCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<RestaurantTableDto> Handle(
        CreateRestaurantTableCommand request,
        CancellationToken cancellationToken)
    {
        var restaurantExists = await _context.Restaurants
            .AnyAsync(r => r.Id == request.RestaurantId, cancellationToken);

        if (!restaurantExists)
        {
            throw new NotFoundException("Restaurant", request.RestaurantId);
        }

        var utcNow = _dateTimeService.UtcNow;
        var publicToken = await RestaurantTableTokenService.GenerateUniqueTokenAsync(
            _context,
            cancellationToken);

        var table = new RestaurantTable
        {
            RestaurantId = request.RestaurantId,
            Name = request.Name.Trim(),
            Zone = TrimToOptional(request.Zone),
            PublicToken = publicToken,
            IsActive = request.IsActive,
            CreatedAt = utcNow
        };

        _context.RestaurantTables.Add(table);
        await _context.SaveChangesAsync(cancellationToken);

        return table.ToDto();
    }

    private static string? TrimToOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

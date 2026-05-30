using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.RestaurantSettings.Common;
using RestaurantOrdering.Application.Features.RestaurantSettings.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantSettings.Commands.UpdateRestaurantSettings;

public sealed class UpdateRestaurantSettingsCommandHandler
    : IRequestHandler<UpdateRestaurantSettingsCommand, RestaurantSettingsDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public UpdateRestaurantSettingsCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<RestaurantSettingsDto> Handle(
        UpdateRestaurantSettingsCommand request,
        CancellationToken cancellationToken)
    {
        var settings = await _context.RestaurantSettings
            .FirstOrDefaultAsync(s => s.RestaurantId == request.RestaurantId, cancellationToken);

        if (settings is null)
        {
            throw new NotFoundException("RestaurantSettings", request.RestaurantId);
        }

        settings.CurrencyCode = request.CurrencyCode.Trim().ToUpperInvariant();
        settings.TimeZone = request.TimeZone.Trim();
        settings.TaxRate = request.TaxRate;
        settings.DeliveryFee = request.DeliveryFee;
        settings.MinimumOrderAmount = request.MinimumOrderAmount;
        settings.IsDeliveryEnabled = request.IsDeliveryEnabled;
        settings.IsPickupEnabled = request.IsPickupEnabled;
        settings.WorkingHoursJson = request.WorkingHoursJson;
        settings.UpdatedAt = _dateTimeService.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return settings.ToDto();
    }
}

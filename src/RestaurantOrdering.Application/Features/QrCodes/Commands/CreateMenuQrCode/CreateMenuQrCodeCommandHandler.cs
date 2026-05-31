using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.QrCodes.Common;
using RestaurantOrdering.Application.Features.QrCodes.DTOs;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.QrCodes.Commands.CreateMenuQrCode;

public sealed class CreateMenuQrCodeCommandHandler
    : IRequestHandler<CreateMenuQrCodeCommand, QrCodeDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public CreateMenuQrCodeCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<QrCodeDto> Handle(
        CreateMenuQrCodeCommand request,
        CancellationToken cancellationToken)
    {
        var restaurantExists = await _context.Restaurants
            .AnyAsync(r => r.Id == request.RestaurantId, cancellationToken);

        if (!restaurantExists)
        {
            throw new NotFoundException("Restaurant", request.RestaurantId);
        }

        var qrCode = new QrCode
        {
            Id = Guid.NewGuid(),
            RestaurantId = request.RestaurantId,
            QrType = QrType.Menu,
            TargetUrl = request.TargetUrl.Trim(),
            QrImageFileId = null,
            IsActive = request.IsActive,
            CreatedAt = _dateTimeService.UtcNow
        };

        _context.QrCodes.Add(qrCode);

        await _context.SaveChangesAsync(cancellationToken);

        return qrCode.ToDto();
    }
}

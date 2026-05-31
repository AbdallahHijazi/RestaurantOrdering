using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.QrCodes.Common;
using RestaurantOrdering.Application.Features.QrCodes.DTOs;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.QrCodes.Commands.UpdateMenuQrCode;

public sealed class UpdateMenuQrCodeCommandHandler
    : IRequestHandler<UpdateMenuQrCodeCommand, QrCodeDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public UpdateMenuQrCodeCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<QrCodeDto> Handle(
        UpdateMenuQrCodeCommand request,
        CancellationToken cancellationToken)
    {
        var qrCode = await _context.QrCodes
            .FirstOrDefaultAsync(
                q => q.Id == request.QrCodeId
                    && q.RestaurantId == request.RestaurantId
                    && q.QrType == QrType.Menu,
                cancellationToken);

        if (qrCode is null)
        {
            throw new NotFoundException("QrCode", request.QrCodeId);
        }

        qrCode.TargetUrl = request.TargetUrl.Trim();
        qrCode.IsActive = request.IsActive;
        qrCode.UpdatedAt = _dateTimeService.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return qrCode.ToDto();
    }
}

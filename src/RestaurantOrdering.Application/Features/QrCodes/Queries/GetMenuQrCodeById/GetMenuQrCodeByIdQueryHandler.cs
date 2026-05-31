using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.QrCodes.Common;
using RestaurantOrdering.Application.Features.QrCodes.DTOs;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.QrCodes.Queries.GetMenuQrCodeById;

public sealed class GetMenuQrCodeByIdQueryHandler
    : IRequestHandler<GetMenuQrCodeByIdQuery, QrCodeDto>
{
    private readonly IApplicationDbContext _context;

    public GetMenuQrCodeByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<QrCodeDto> Handle(
        GetMenuQrCodeByIdQuery request,
        CancellationToken cancellationToken)
    {
        var qrCode = await _context.QrCodes
            .AsNoTracking()
            .SingleOrDefaultAsync(
                q => q.Id == request.QrCodeId
                    && q.RestaurantId == request.RestaurantId
                    && q.QrType == QrType.Menu,
                cancellationToken);

        if (qrCode is null)
        {
            throw new NotFoundException("QrCode", request.QrCodeId);
        }

        return qrCode.ToDto();
    }
}

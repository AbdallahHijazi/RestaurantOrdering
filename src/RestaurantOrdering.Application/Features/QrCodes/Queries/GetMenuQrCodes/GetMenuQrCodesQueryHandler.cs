using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.QrCodes.Common;
using RestaurantOrdering.Application.Features.QrCodes.DTOs;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.QrCodes.Queries.GetMenuQrCodes;

public sealed class GetMenuQrCodesQueryHandler
    : IRequestHandler<GetMenuQrCodesQuery, IReadOnlyList<QrCodeDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMenuQrCodesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<QrCodeDto>> Handle(
        GetMenuQrCodesQuery request,
        CancellationToken cancellationToken)
    {
        var qrCodes = await _context.QrCodes
            .AsNoTracking()
            .Where(q => q.RestaurantId == request.RestaurantId && q.QrType == QrType.Menu)
            .OrderByDescending(q => q.CreatedAt)
            .ThenByDescending(q => q.Id)
            .ToListAsync(cancellationToken);

        return qrCodes
            .Select(q => q.ToDto())
            .ToList()
            .AsReadOnly();
    }
}

using MediatR;
using RestaurantOrdering.Application.Features.QrCodes.DTOs;

namespace RestaurantOrdering.Application.Features.QrCodes.Queries.GetMenuQrCodes;

public sealed record GetMenuQrCodesQuery(Guid RestaurantId)
    : IRequest<IReadOnlyList<QrCodeDto>>;

using MediatR;
using RestaurantOrdering.Application.Features.QrCodes.DTOs;

namespace RestaurantOrdering.Application.Features.QrCodes.Queries.GetMenuQrCodeById;

public sealed record GetMenuQrCodeByIdQuery(Guid RestaurantId, Guid QrCodeId)
    : IRequest<QrCodeDto>;

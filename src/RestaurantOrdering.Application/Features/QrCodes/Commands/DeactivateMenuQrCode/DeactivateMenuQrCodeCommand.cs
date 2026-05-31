using MediatR;
using RestaurantOrdering.Application.Features.QrCodes.DTOs;

namespace RestaurantOrdering.Application.Features.QrCodes.Commands.DeactivateMenuQrCode;

public sealed record DeactivateMenuQrCodeCommand(Guid RestaurantId, Guid QrCodeId)
    : IRequest<QrCodeDto>;

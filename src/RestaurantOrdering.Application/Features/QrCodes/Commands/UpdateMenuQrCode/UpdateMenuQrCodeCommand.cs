using MediatR;
using RestaurantOrdering.Application.Features.QrCodes.DTOs;

namespace RestaurantOrdering.Application.Features.QrCodes.Commands.UpdateMenuQrCode;

public sealed record UpdateMenuQrCodeCommand(
    Guid RestaurantId,
    Guid QrCodeId,
    string TargetUrl,
    bool IsActive) : IRequest<QrCodeDto>;

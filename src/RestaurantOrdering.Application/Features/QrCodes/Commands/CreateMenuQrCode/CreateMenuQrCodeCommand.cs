using MediatR;
using RestaurantOrdering.Application.Features.QrCodes.DTOs;

namespace RestaurantOrdering.Application.Features.QrCodes.Commands.CreateMenuQrCode;

public sealed record CreateMenuQrCodeCommand(
    Guid RestaurantId,
    string TargetUrl,
    bool IsActive = true) : IRequest<QrCodeDto>;

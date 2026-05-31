using RestaurantOrdering.Application.Features.QrCodes.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.QrCodes.Common;

public static class QrCodeMappings
{
    public static QrCodeDto ToDto(this QrCode qrCode) => new()
    {
        Id = qrCode.Id,
        RestaurantId = qrCode.RestaurantId,
        QrImageFileId = qrCode.QrImageFileId,
        QrType = qrCode.QrType,
        TargetUrl = qrCode.TargetUrl,
        IsActive = qrCode.IsActive,
        CreatedAt = qrCode.CreatedAt,
        UpdatedAt = qrCode.UpdatedAt
    };
}

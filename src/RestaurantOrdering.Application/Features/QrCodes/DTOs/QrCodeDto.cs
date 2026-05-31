using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.QrCodes.DTOs;

public class QrCodeDto
{
    public Guid Id { get; init; }
    public Guid RestaurantId { get; init; }
    public Guid? QrImageFileId { get; init; }
    public QrType QrType { get; init; }
    public string TargetUrl { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

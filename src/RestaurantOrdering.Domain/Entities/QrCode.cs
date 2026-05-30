using RestaurantOrdering.Domain.Common;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Domain.Entities;

public class QrCode : AuditableEntity
{
    public Guid RestaurantId { get; set; }
    public Guid? QrImageFileId { get; set; }
    public QrType QrType { get; set; } = QrType.Menu;
    public string TargetUrl { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public Restaurant Restaurant { get; set; } = null!;
    public MediaFile? QrImageFile { get; set; }
}

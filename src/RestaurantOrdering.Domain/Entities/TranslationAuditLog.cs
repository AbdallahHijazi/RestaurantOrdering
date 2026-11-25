using RestaurantOrdering.Domain.Common;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Domain.Entities;

public class TranslationAuditLog : BaseEntity
{
    public Guid RestaurantId { get; set; }
    public Guid? ActorUserId { get; set; }
    public TranslationAuditEventType EventType { get; set; }
    public TranslatableEntityType? EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public string? LocaleCode { get; set; }
    public string? PayloadJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Restaurant Restaurant { get; set; } = null!;
}

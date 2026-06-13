using RestaurantOrdering.Domain.Common;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Domain.Entities;

public class TranslationJob : BaseEntity
{
    public Guid RestaurantId { get; set; }
    public TranslatableEntityType EntityType { get; set; }
    public Guid EntityId { get; set; }
    public string TargetLocaleCode { get; set; } = string.Empty;
    public string SourceLocaleCode { get; set; } = string.Empty;
    public int SourceVersion { get; set; } = 1;
    public TranslationJobStatus Status { get; set; } = TranslationJobStatus.Queued;
    public int AttemptCount { get; set; }
    public int MaxAttempts { get; set; } = 3;
    public DateTime? NextAttemptAt { get; set; }
    public string IdempotencyKey { get; set; } = string.Empty;
    public string? LastError { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public DateTime? ClaimedAt { get; set; }
    public DateTime? LeaseExpiresAt { get; set; }
    public string? WorkerId { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public LocaleDefinition TargetLocale { get; set; } = null!;
    public LocaleDefinition SourceLocale { get; set; } = null!;
}

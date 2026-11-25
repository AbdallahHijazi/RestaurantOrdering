using RestaurantOrdering.Domain.Common;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Domain.Entities;

public class RestaurantTranslation : AuditableEntity
{
    public Guid RestaurantId { get; set; }
    public string LocaleCode { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Address { get; set; }
    public TranslationSource? PublishedSource { get; set; }
    public int? PublishedSourceVersion { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public string? DraftName { get; set; }
    public string? DraftDescription { get; set; }
    public string? DraftAddress { get; set; }
    public TranslationStatus? DraftStatus { get; set; }
    public TranslationSource? DraftSource { get; set; }
    public int? DraftSourceVersion { get; set; }
    public DateTime? DraftGeneratedAt { get; set; }
    public string? DraftLastError { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public LocaleDefinition Locale { get; set; } = null!;
}

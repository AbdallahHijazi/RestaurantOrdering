using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Translations.Common;

internal sealed class TranslationReviewSnapshot
{
    public Guid TranslationId { get; init; }
    public TranslatableEntityType EntityType { get; init; }
    public Guid EntityId { get; init; }
    public Guid RestaurantId { get; init; }
    public string LocaleCode { get; init; } = string.Empty;
    public string EntityDisplayName { get; init; } = string.Empty;
    public int ContentVersion { get; init; }
    public TranslationStatus? DraftStatus { get; init; }
    public TranslationSource? DraftSource { get; init; }
    public string? DraftName { get; init; }
    public string? DraftDescription { get; init; }
    public string? DraftAddress { get; init; }
    public string? PublishedName { get; init; }
    public string? PublishedDescription { get; init; }
    public string? PublishedAddress { get; init; }
    public int? DraftSourceVersion { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public bool HasFailedJobForCurrentVersion { get; init; }
}

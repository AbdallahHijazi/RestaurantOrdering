namespace RestaurantOrdering.Application.Features.Translations.DTOs;

public sealed class TranslationReviewDto
{
    public Guid TranslationId { get; init; }
    public string EntityType { get; init; } = string.Empty;
    public Guid EntityId { get; init; }
    public string EntityDisplayName { get; init; } = string.Empty;
    public string Locale { get; init; } = string.Empty;
    public string? DraftStatus { get; init; }
    public string? DraftSource { get; init; }
    public string? DraftName { get; init; }
    public string? DraftDescription { get; init; }
    public string? DraftAddress { get; init; }
    public string? PublishedName { get; init; }
    public string? PublishedDescription { get; init; }
    public string? PublishedAddress { get; init; }
    public int? DraftSourceVersion { get; init; }
    public int CurrentContentVersion { get; init; }
    public bool IsStale { get; init; }
    public bool CanApprove { get; init; }
    public bool CanRetry { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

namespace RestaurantOrdering.Application.Features.Translations.DTOs;

public sealed class PagedTranslationReviewResultDto
{
    public IReadOnlyList<TranslationReviewDto> Items { get; init; } = [];
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalCount { get; init; }
}

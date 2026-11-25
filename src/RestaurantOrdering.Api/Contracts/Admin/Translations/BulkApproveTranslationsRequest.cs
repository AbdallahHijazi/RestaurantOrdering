namespace RestaurantOrdering.Api.Contracts.Admin.Translations;

public sealed class BulkApproveTranslationsRequest
{
    public IReadOnlyList<Guid> TranslationIds { get; init; } = [];
}

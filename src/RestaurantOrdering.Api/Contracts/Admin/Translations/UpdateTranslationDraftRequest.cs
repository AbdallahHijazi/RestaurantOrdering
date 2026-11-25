namespace RestaurantOrdering.Api.Contracts.Admin.Translations;

public sealed class UpdateTranslationDraftRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? Address { get; init; }
}

namespace RestaurantOrdering.Application.Common.Translation;

public sealed record TranslationFields(
    string Name,
    string? Description = null,
    string? Address = null);

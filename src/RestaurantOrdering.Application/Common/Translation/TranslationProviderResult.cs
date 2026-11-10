namespace RestaurantOrdering.Application.Common.Translation;

public sealed record TranslationProviderResult(
    bool IsSuccess,
    TranslationFields? TranslatedFields,
    IReadOnlyList<string> FailedFieldKeys,
    string? ErrorCode,
    string? ErrorMessage);

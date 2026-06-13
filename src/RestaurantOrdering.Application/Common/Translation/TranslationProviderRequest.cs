namespace RestaurantOrdering.Application.Common.Translation;

public sealed record TranslationProviderRequest(
    string SourceLocale,
    string TargetLocale,
    TranslationFields Fields,
    string IdempotencyKey);

namespace RestaurantOrdering.Application.Common.Localization;

/// <summary>
/// Temporary dual-read helper for 7A.3 — prefers current published translation fields, falls back to legacy columns.
/// Remove once CRUD writes target translation tables exclusively.
/// </summary>
public static class PublishedTranslationDualRead
{
    public static string ResolveRequired(
        string? publishedValue,
        int? publishedSourceVersion,
        int currentContentVersion,
        string legacy) =>
        ResolveRequired(GetPublishedIfCurrent(publishedValue, publishedSourceVersion, currentContentVersion), legacy);

    public static string? ResolveOptional(
        string? publishedValue,
        int? publishedSourceVersion,
        int currentContentVersion,
        string? legacy) =>
        ResolveOptional(GetPublishedIfCurrent(publishedValue, publishedSourceVersion, currentContentVersion), legacy);

    public static string ResolveRequired(string? published, string legacy) =>
        !string.IsNullOrWhiteSpace(published) ? published.Trim() : legacy;

    public static string? ResolveOptional(string? published, string? legacy) =>
        !string.IsNullOrWhiteSpace(published)
            ? published.Trim()
            : string.IsNullOrWhiteSpace(legacy) ? null : legacy.Trim();

    private static string? GetPublishedIfCurrent(
        string? publishedValue,
        int? publishedSourceVersion,
        int currentContentVersion) =>
        publishedSourceVersion == currentContentVersion ? publishedValue : null;
}

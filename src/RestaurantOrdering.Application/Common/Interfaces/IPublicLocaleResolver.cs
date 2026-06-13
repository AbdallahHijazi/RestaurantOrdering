namespace RestaurantOrdering.Application.Common.Interfaces;

public interface IPublicLocaleResolver
{
    PublicMenuLocaleResolution ResolveMenuLocale(
        string? requestedLang,
        string defaultLocale,
        IReadOnlyCollection<PublicRestaurantSupportedLocale> supportedLocales,
        IReadOnlyDictionary<string, PublicLocaleDefinitionInfo> localeDefinitions);

    PublicLocalizedContent ResolveRestaurantContent(
        PublicMenuLocaleResolution menuLocale,
        string defaultLocale,
        IReadOnlyCollection<PublicRestaurantSupportedLocale> supportedLocales,
        IReadOnlyDictionary<string, PublicLocaleDefinitionInfo> localeDefinitions,
        IReadOnlyDictionary<string, PublicPublishedTranslationContent> translationsByLocale,
        int contentVersion,
        string legacyNameAr,
        string? legacyNameEn,
        string? legacyDescriptionAr,
        string? legacyDescriptionEn,
        string? legacyAddressAr,
        string? legacyAddressEn);

    PublicLocalizedContent ResolveCategoryContent(
        PublicMenuLocaleResolution menuLocale,
        string defaultLocale,
        IReadOnlyCollection<PublicRestaurantSupportedLocale> supportedLocales,
        IReadOnlyDictionary<string, PublicLocaleDefinitionInfo> localeDefinitions,
        IReadOnlyDictionary<string, PublicPublishedTranslationContent> translationsByLocale,
        int contentVersion,
        string legacyNameAr,
        string? legacyNameEn,
        string? legacyDescriptionAr,
        string? legacyDescriptionEn);

    PublicLocalizedContent ResolveMenuItemContent(
        PublicMenuLocaleResolution menuLocale,
        string defaultLocale,
        IReadOnlyCollection<PublicRestaurantSupportedLocale> supportedLocales,
        IReadOnlyDictionary<string, PublicLocaleDefinitionInfo> localeDefinitions,
        IReadOnlyDictionary<string, PublicPublishedTranslationContent> translationsByLocale,
        int contentVersion,
        string legacyNameAr,
        string? legacyNameEn,
        string? legacyDescriptionAr,
        string? legacyDescriptionEn);
}

public sealed record PublicMenuLocaleResolution(
    string? RequestedLocale,
    string ResolvedLocale,
    bool FallbackApplied,
    string Direction);

public sealed record PublicLocalizedContent(
    string Name,
    string? Description,
    string? Address,
    string ResolvedLocale,
    bool FallbackApplied);

public sealed record PublicRestaurantSupportedLocale(string LocaleCode, bool IsEnabled, int SortOrder);

public sealed record PublicLocaleDefinitionInfo(string Code, string Direction);

public sealed record PublicPublishedTranslationContent(
    string? Name,
    string? Description,
    string? Address,
    int? PublishedSourceVersion);

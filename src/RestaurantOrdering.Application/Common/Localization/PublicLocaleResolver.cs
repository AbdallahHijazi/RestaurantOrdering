using RestaurantOrdering.Application.Common.Interfaces;

namespace RestaurantOrdering.Application.Common.Localization;

public sealed class PublicLocaleResolver : IPublicLocaleResolver
{
    public PublicMenuLocaleResolution ResolveMenuLocale(
        string? requestedLang,
        string defaultLocale,
        IReadOnlyCollection<PublicRestaurantSupportedLocale> supportedLocales,
        IReadOnlyDictionary<string, PublicLocaleDefinitionInfo> localeDefinitions)
    {
        var normalizedDefault = NormalizeLocaleCode(defaultLocale) ?? "ar";
        var normalizedRequested = NormalizeLocaleCode(requestedLang);

        if (normalizedRequested is null)
        {
            return new PublicMenuLocaleResolution(
                RequestedLocale: null,
                ResolvedLocale: normalizedDefault,
                FallbackApplied: false,
                Direction: GetDirection(normalizedDefault, localeDefinitions));
        }

        if (!IsEnabledRestaurantLocale(normalizedRequested, supportedLocales, localeDefinitions))
        {
            return new PublicMenuLocaleResolution(
                RequestedLocale: normalizedRequested,
                ResolvedLocale: normalizedDefault,
                FallbackApplied: true,
                Direction: GetDirection(normalizedDefault, localeDefinitions));
        }

        return new PublicMenuLocaleResolution(
            RequestedLocale: normalizedRequested,
            ResolvedLocale: normalizedRequested,
            FallbackApplied: false,
            Direction: GetDirection(normalizedRequested, localeDefinitions));
    }

    public PublicLocalizedContent ResolveRestaurantContent(
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
        string? legacyAddressEn)
    {
        var name = ResolveRequiredField(
            menuLocale.ResolvedLocale,
            defaultLocale,
            supportedLocales,
            localeDefinitions,
            translationsByLocale,
            contentVersion,
            legacyNameAr,
            legacyNameEn,
            fieldSelector: static translation => translation.Name);

        var description = ResolveOptionalField(
            menuLocale.ResolvedLocale,
            defaultLocale,
            supportedLocales,
            localeDefinitions,
            translationsByLocale,
            contentVersion,
            legacyDescriptionAr,
            legacyDescriptionEn,
            fieldSelector: static translation => translation.Description);

        var address = ResolveOptionalField(
            menuLocale.ResolvedLocale,
            defaultLocale,
            supportedLocales,
            localeDefinitions,
            translationsByLocale,
            contentVersion,
            legacyAddressAr,
            legacyAddressEn,
            fieldSelector: static translation => translation.Address);

        return new PublicLocalizedContent(
            name.Value,
            description.Value,
            address.Value,
            name.ResolvedLocale,
            name.FallbackApplied || description.FallbackApplied || address.FallbackApplied);
    }

    public PublicLocalizedContent ResolveCategoryContent(
        PublicMenuLocaleResolution menuLocale,
        string defaultLocale,
        IReadOnlyCollection<PublicRestaurantSupportedLocale> supportedLocales,
        IReadOnlyDictionary<string, PublicLocaleDefinitionInfo> localeDefinitions,
        IReadOnlyDictionary<string, PublicPublishedTranslationContent> translationsByLocale,
        int contentVersion,
        string legacyNameAr,
        string? legacyNameEn,
        string? legacyDescriptionAr,
        string? legacyDescriptionEn)
    {
        var name = ResolveRequiredField(
            menuLocale.ResolvedLocale,
            defaultLocale,
            supportedLocales,
            localeDefinitions,
            translationsByLocale,
            contentVersion,
            legacyNameAr,
            legacyNameEn,
            fieldSelector: static translation => translation.Name);

        var description = ResolveOptionalField(
            menuLocale.ResolvedLocale,
            defaultLocale,
            supportedLocales,
            localeDefinitions,
            translationsByLocale,
            contentVersion,
            legacyDescriptionAr,
            legacyDescriptionEn,
            fieldSelector: static translation => translation.Description);

        return new PublicLocalizedContent(
            name.Value,
            description.Value,
            Address: null,
            name.ResolvedLocale,
            name.FallbackApplied || description.FallbackApplied);
    }

    public PublicLocalizedContent ResolveMenuItemContent(
        PublicMenuLocaleResolution menuLocale,
        string defaultLocale,
        IReadOnlyCollection<PublicRestaurantSupportedLocale> supportedLocales,
        IReadOnlyDictionary<string, PublicLocaleDefinitionInfo> localeDefinitions,
        IReadOnlyDictionary<string, PublicPublishedTranslationContent> translationsByLocale,
        int contentVersion,
        string legacyNameAr,
        string? legacyNameEn,
        string? legacyDescriptionAr,
        string? legacyDescriptionEn) =>
        ResolveCategoryContent(
            menuLocale,
            defaultLocale,
            supportedLocales,
            localeDefinitions,
            translationsByLocale,
            contentVersion,
            legacyNameAr,
            legacyNameEn,
            legacyDescriptionAr,
            legacyDescriptionEn);

    public PublicLocalizedContent ResolveAdminCatalogPrimaryContent(
        PublicMenuLocaleResolution menuLocale,
        string defaultLocale,
        IReadOnlyCollection<PublicRestaurantSupportedLocale> supportedLocales,
        IReadOnlyDictionary<string, PublicLocaleDefinitionInfo> localeDefinitions,
        IReadOnlyDictionary<string, PublicPublishedTranslationContent> translationsByLocale,
        int contentVersion,
        string legacyNameAr,
        string? legacyNameEn,
        string? legacyDescriptionAr,
        string? legacyDescriptionEn)
    {
        var name = ResolveRequiredField(
            menuLocale.ResolvedLocale,
            defaultLocale,
            supportedLocales,
            localeDefinitions,
            translationsByLocale,
            contentVersion,
            legacyNameAr,
            legacyNameEn,
            fieldSelector: static translation => translation.Name);

        var description = ResolveOptionalField(
            menuLocale.ResolvedLocale,
            defaultLocale,
            supportedLocales,
            localeDefinitions,
            translationsByLocale,
            contentVersion,
            legacyDescriptionAr,
            legacyDescriptionEn,
            fieldSelector: static translation => translation.Description);

        return new PublicLocalizedContent(
            name.Value,
            description.Value,
            Address: null,
            name.ResolvedLocale,
            name.FallbackApplied);
    }

    private static ResolvedFieldResult ResolveRequiredField(
        string preferredLocale,
        string defaultLocale,
        IReadOnlyCollection<PublicRestaurantSupportedLocale> supportedLocales,
        IReadOnlyDictionary<string, PublicLocaleDefinitionInfo> localeDefinitions,
        IReadOnlyDictionary<string, PublicPublishedTranslationContent> translationsByLocale,
        int contentVersion,
        string legacyNameAr,
        string? legacyNameEn,
        Func<PublicPublishedTranslationContent, string?> fieldSelector)
    {
        foreach (var locale in BuildLocaleFallbackOrder(preferredLocale, defaultLocale, supportedLocales, localeDefinitions))
        {
            if (TryGetPublishedField(translationsByLocale, contentVersion, locale, fieldSelector, out var value))
            {
                return new ResolvedFieldResult(value, locale, locale != preferredLocale);
            }
        }

        foreach (var locale in BuildLocaleFallbackOrder(preferredLocale, defaultLocale, supportedLocales, localeDefinitions))
        {
            var legacyValue = TryResolveLegacyName(locale, defaultLocale, legacyNameAr, legacyNameEn);
            if (!string.IsNullOrWhiteSpace(legacyValue))
            {
                return new ResolvedFieldResult(legacyValue, locale, locale != preferredLocale);
            }
        }

        return new ResolvedFieldResult(legacyNameAr, "ar", true);
    }

    private static ResolvedOptionalFieldResult ResolveOptionalField(
        string preferredLocale,
        string defaultLocale,
        IReadOnlyCollection<PublicRestaurantSupportedLocale> supportedLocales,
        IReadOnlyDictionary<string, PublicLocaleDefinitionInfo> localeDefinitions,
        IReadOnlyDictionary<string, PublicPublishedTranslationContent> translationsByLocale,
        int contentVersion,
        string? legacyPrimary,
        string? legacySecondary,
        Func<PublicPublishedTranslationContent, string?> fieldSelector)
    {
        foreach (var locale in BuildLocaleFallbackOrder(preferredLocale, defaultLocale, supportedLocales, localeDefinitions))
        {
            if (TryGetPublishedField(translationsByLocale, contentVersion, locale, fieldSelector, out var value))
            {
                return new ResolvedOptionalFieldResult(value, locale, locale != preferredLocale);
            }
        }

        foreach (var locale in BuildLocaleFallbackOrder(preferredLocale, defaultLocale, supportedLocales, localeDefinitions))
        {
            var legacyValue = TryResolveLegacyOptional(locale, defaultLocale, legacyPrimary, legacySecondary);
            if (!string.IsNullOrWhiteSpace(legacyValue))
            {
                return new ResolvedOptionalFieldResult(legacyValue, locale, locale != preferredLocale);
            }
        }

        return new ResolvedOptionalFieldResult(
            PublishedTranslationDualRead.ResolveOptional(legacyPrimary, legacySecondary),
            "ar",
            true);
    }

    private static IReadOnlyList<string> BuildLocaleFallbackOrder(
        string preferredLocale,
        string defaultLocale,
        IReadOnlyCollection<PublicRestaurantSupportedLocale> supportedLocales,
        IReadOnlyDictionary<string, PublicLocaleDefinitionInfo> localeDefinitions)
    {
        var enabledLocales = supportedLocales
            .Where(item => item.IsEnabled && localeDefinitions.ContainsKey(item.LocaleCode))
            .OrderBy(item => item.SortOrder)
            .Select(item => item.LocaleCode)
            .ToList();

        var ordered = new List<string>();
        AddLocale(ordered, preferredLocale);
        AddLocale(ordered, NormalizeLocaleCode(defaultLocale) ?? "ar");
        AddLocale(ordered, "en");

        foreach (var locale in enabledLocales)
        {
            AddLocale(ordered, locale);
        }

        return ordered;
    }

    private static bool TryGetPublishedField(
        IReadOnlyDictionary<string, PublicPublishedTranslationContent> translationsByLocale,
        int contentVersion,
        string locale,
        Func<PublicPublishedTranslationContent, string?> fieldSelector,
        out string value)
    {
        value = string.Empty;

        if (!translationsByLocale.TryGetValue(locale, out var translation)
            || translation.PublishedSourceVersion != contentVersion)
        {
            return false;
        }

        var publishedValue = fieldSelector(translation);
        if (string.IsNullOrWhiteSpace(publishedValue))
        {
            return false;
        }

        value = publishedValue.Trim();
        return true;
    }

    private static string? TryResolveLegacyName(
        string locale,
        string defaultLocale,
        string legacyNameAr,
        string? legacyNameEn) =>
        locale switch
        {
            "ar" => legacyNameAr,
            "en" => PublishedTranslationDualRead.ResolveOptional(legacyNameEn, legacyNameAr),
            _ when locale == defaultLocale && defaultLocale is "ar" or "en" =>
                TryResolveLegacyName(defaultLocale, defaultLocale, legacyNameAr, legacyNameEn),
            _ => null
        };

    private static string? TryResolveLegacyOptional(
        string locale,
        string defaultLocale,
        string? legacyPrimary,
        string? legacySecondary) =>
        locale switch
        {
            "ar" => PublishedTranslationDualRead.ResolveOptional(legacyPrimary, legacySecondary),
            "en" => PublishedTranslationDualRead.ResolveOptional(legacySecondary, legacyPrimary),
            _ when locale == defaultLocale && defaultLocale is "ar" or "en" =>
                TryResolveLegacyOptional(defaultLocale, defaultLocale, legacyPrimary, legacySecondary),
            _ => null
        };

    private static bool IsEnabledRestaurantLocale(
        string localeCode,
        IReadOnlyCollection<PublicRestaurantSupportedLocale> supportedLocales,
        IReadOnlyDictionary<string, PublicLocaleDefinitionInfo> localeDefinitions) =>
        localeDefinitions.ContainsKey(localeCode)
        && supportedLocales.Any(item => item.IsEnabled && item.LocaleCode == localeCode);

    private static string GetDirection(
        string localeCode,
        IReadOnlyDictionary<string, PublicLocaleDefinitionInfo> localeDefinitions) =>
        localeDefinitions.TryGetValue(localeCode, out var definition)
            ? definition.Direction
            : "ltr";

    private static string? NormalizeLocaleCode(string? localeCode)
    {
        if (string.IsNullOrWhiteSpace(localeCode))
        {
            return null;
        }

        return localeCode.Trim().ToLowerInvariant();
    }

    private static void AddLocale(ICollection<string> locales, string? localeCode)
    {
        var normalized = NormalizeLocaleCode(localeCode);
        if (normalized is null || locales.Contains(normalized))
        {
            return;
        }

        locales.Add(normalized);
    }

    private readonly record struct ResolvedFieldResult(string Value, string ResolvedLocale, bool FallbackApplied);

    private readonly record struct ResolvedOptionalFieldResult(
        string? Value,
        string ResolvedLocale,
        bool FallbackApplied);
}

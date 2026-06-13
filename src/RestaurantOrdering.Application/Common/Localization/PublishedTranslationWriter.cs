using FluentValidation;
using FluentValidation.Results;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Common.Localization;

public sealed class PublishedTranslationWriter : IPublishedTranslationWriter
{
    private static readonly HashSet<string> LegacyPayloadLocales = new(StringComparer.Ordinal)
    {
        "ar",
        "en"
    };

    private static readonly HashSet<string> SupportedLegacyDefaultLocales = new(StringComparer.Ordinal)
    {
        "ar",
        "en"
    };

    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public PublishedTranslationWriter(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task EnsureLegacyBilingualWriteSupportedAsync(
        Guid restaurantId,
        CancellationToken cancellationToken)
    {
        var defaultLocale = await GetDefaultLocaleAsync(restaurantId, cancellationToken);

        if (!SupportedLegacyDefaultLocales.Contains(defaultLocale))
        {
            throw new ValidationException(new[]
            {
                new ValidationFailure(
                    "DefaultLocale",
                    $"Legacy bilingual catalog writes are not supported when the restaurant primary locale is '{defaultLocale}'. Use the future primary-locale catalog workflow instead.")
            });
        }
    }

    public async Task InitializeRegistrationCatalogAsync(
        Restaurant restaurant,
        CancellationToken cancellationToken)
    {
        var now = _dateTimeService.UtcNow;

        _context.RestaurantSupportedLocales.AddRange(
            new RestaurantSupportedLocale
            {
                RestaurantId = restaurant.Id,
                LocaleCode = "ar",
                IsEnabled = true,
                SortOrder = 1,
                CreatedAt = now
            },
            new RestaurantSupportedLocale
            {
                RestaurantId = restaurant.Id,
                LocaleCode = "en",
                IsEnabled = true,
                SortOrder = 2,
                CreatedAt = now
            });

        await UpsertRestaurantPublishedTranslationsAsync(restaurant, isManualEdit: false, cancellationToken);
    }

    public async Task UpsertRestaurantPublishedTranslationsAsync(
        Restaurant restaurant,
        bool isManualEdit,
        CancellationToken cancellationToken)
    {
        var defaultLocale = await GetDefaultLocaleAsync(restaurant.Id, cancellationToken);
        var now = _dateTimeService.UtcNow;

        await UpsertRestaurantLocaleAsync(
            restaurant,
            "ar",
            restaurant.NameAr,
            restaurant.DescriptionAr,
            restaurant.AddressAr,
            defaultLocale,
            isManualEdit,
            now,
            cancellationToken);

        await UpsertRestaurantLocaleAsync(
            restaurant,
            "en",
            restaurant.NameEn,
            restaurant.DescriptionEn,
            restaurant.AddressEn,
            defaultLocale,
            isManualEdit,
            now,
            cancellationToken);
    }

    public async Task UpsertCategoryPublishedTranslationsAsync(
        Category category,
        bool isManualEdit,
        CancellationToken cancellationToken)
    {
        var defaultLocale = await GetDefaultLocaleAsync(category.RestaurantId, cancellationToken);
        var now = _dateTimeService.UtcNow;

        await UpsertCategoryLocaleAsync(
            category,
            "ar",
            category.NameAr,
            category.DescriptionAr,
            defaultLocale,
            isManualEdit,
            now,
            cancellationToken);

        await UpsertCategoryLocaleAsync(
            category,
            "en",
            category.NameEn,
            category.DescriptionEn,
            defaultLocale,
            isManualEdit,
            now,
            cancellationToken);
    }

    public async Task UpsertMenuItemPublishedTranslationsAsync(
        MenuItem menuItem,
        bool isManualEdit,
        CancellationToken cancellationToken)
    {
        var defaultLocale = await GetDefaultLocaleAsync(menuItem.RestaurantId, cancellationToken);
        var now = _dateTimeService.UtcNow;

        await UpsertMenuItemLocaleAsync(
            menuItem,
            "ar",
            menuItem.NameAr,
            menuItem.DescriptionAr,
            defaultLocale,
            isManualEdit,
            now,
            cancellationToken);

        await UpsertMenuItemLocaleAsync(
            menuItem,
            "en",
            menuItem.NameEn,
            menuItem.DescriptionEn,
            defaultLocale,
            isManualEdit,
            now,
            cancellationToken);
    }

    public Task<string> GetRestaurantDefaultLocaleAsync(
        Guid restaurantId,
        CancellationToken cancellationToken) =>
        GetDefaultLocaleAsync(restaurantId, cancellationToken);

    public async Task UpsertCategoryPrimaryLocaleTranslationAsync(
        Category category,
        string localeCode,
        string name,
        string? description,
        bool isManualEdit,
        CancellationToken cancellationToken)
    {
        var defaultLocale = await GetDefaultLocaleAsync(category.RestaurantId, cancellationToken);
        var now = _dateTimeService.UtcNow;

        await UpsertCategoryPrimaryLocaleAsync(
            category,
            localeCode,
            name,
            description,
            defaultLocale,
            isManualEdit,
            now,
            cancellationToken);
    }

    public async Task UpsertMenuItemPrimaryLocaleTranslationAsync(
        MenuItem menuItem,
        string localeCode,
        string name,
        string? description,
        bool isManualEdit,
        CancellationToken cancellationToken)
    {
        var defaultLocale = await GetDefaultLocaleAsync(menuItem.RestaurantId, cancellationToken);
        var now = _dateTimeService.UtcNow;

        await UpsertMenuItemPrimaryLocaleAsync(
            menuItem,
            localeCode,
            name,
            description,
            defaultLocale,
            isManualEdit,
            now,
            cancellationToken);
    }

    public async Task UpsertRestaurantPrimaryLocaleTranslationAsync(
        Restaurant restaurant,
        string localeCode,
        string name,
        string? description,
        string? address,
        bool isManualEdit,
        CancellationToken cancellationToken)
    {
        var defaultLocale = await GetDefaultLocaleAsync(restaurant.Id, cancellationToken);
        var now = _dateTimeService.UtcNow;

        await UpsertRestaurantPrimaryLocaleAsync(
            restaurant,
            localeCode,
            name,
            description,
            address,
            defaultLocale,
            isManualEdit,
            now,
            cancellationToken);
    }

    private async Task<string> GetDefaultLocaleAsync(Guid restaurantId, CancellationToken cancellationToken)
    {
        var localDefaultLocale = _context.RestaurantSettings.Local
            .FirstOrDefault(settings => settings.RestaurantId == restaurantId)
            ?.DefaultLocale;

        if (!string.IsNullOrWhiteSpace(localDefaultLocale))
        {
            return localDefaultLocale;
        }

        return await _context.RestaurantSettings
            .Where(settings => settings.RestaurantId == restaurantId)
            .Select(settings => settings.DefaultLocale)
            .SingleAsync(cancellationToken);
    }

    private async Task UpsertRestaurantLocaleAsync(
        Restaurant restaurant,
        string localeCode,
        string? name,
        string? description,
        string? address,
        string defaultLocale,
        bool isManualEdit,
        DateTime now,
        CancellationToken cancellationToken)
    {
        if (!LegacyPayloadLocales.Contains(localeCode) || string.IsNullOrWhiteSpace(name))
        {
            return;
        }

        var translation = await _context.RestaurantTranslations
            .FirstOrDefaultAsync(
                item => item.RestaurantId == restaurant.Id && item.LocaleCode == localeCode,
                cancellationToken);

        if (translation is null)
        {
            translation = new RestaurantTranslation
            {
                RestaurantId = restaurant.Id,
                LocaleCode = localeCode,
                CreatedAt = now
            };
            _context.RestaurantTranslations.Add(translation);
        }

        ApplyPublishedFields(
            translation,
            name,
            description,
            address,
            ResolvePublishedSource(localeCode, defaultLocale, isManualEdit),
            restaurant.ContentVersion,
            now);
    }

    private async Task UpsertCategoryLocaleAsync(
        Category category,
        string localeCode,
        string? name,
        string? description,
        string defaultLocale,
        bool isManualEdit,
        DateTime now,
        CancellationToken cancellationToken)
    {
        if (!LegacyPayloadLocales.Contains(localeCode) || string.IsNullOrWhiteSpace(name))
        {
            return;
        }

        var translation = await _context.CategoryTranslations
            .FirstOrDefaultAsync(
                item => item.CategoryId == category.Id && item.LocaleCode == localeCode,
                cancellationToken);

        if (translation is null)
        {
            translation = new CategoryTranslation
            {
                CategoryId = category.Id,
                LocaleCode = localeCode,
                CreatedAt = now
            };
            _context.CategoryTranslations.Add(translation);
        }

        ApplyPublishedFields(
            translation,
            name,
            description,
            ResolvePublishedSource(localeCode, defaultLocale, isManualEdit),
            category.ContentVersion,
            now);
    }

    private async Task UpsertMenuItemLocaleAsync(
        MenuItem menuItem,
        string localeCode,
        string? name,
        string? description,
        string defaultLocale,
        bool isManualEdit,
        DateTime now,
        CancellationToken cancellationToken)
    {
        if (!LegacyPayloadLocales.Contains(localeCode) || string.IsNullOrWhiteSpace(name))
        {
            return;
        }

        var translation = await _context.MenuItemTranslations
            .FirstOrDefaultAsync(
                item => item.MenuItemId == menuItem.Id && item.LocaleCode == localeCode,
                cancellationToken);

        if (translation is null)
        {
            translation = new MenuItemTranslation
            {
                MenuItemId = menuItem.Id,
                LocaleCode = localeCode,
                CreatedAt = now
            };
            _context.MenuItemTranslations.Add(translation);
        }

        ApplyPublishedFields(
            translation,
            name,
            description,
            ResolvePublishedSource(localeCode, defaultLocale, isManualEdit),
            menuItem.ContentVersion,
            now);
    }

    private async Task UpsertCategoryPrimaryLocaleAsync(
        Category category,
        string localeCode,
        string name,
        string? description,
        string defaultLocale,
        bool isManualEdit,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var translation = await _context.CategoryTranslations
            .FirstOrDefaultAsync(
                item => item.CategoryId == category.Id && item.LocaleCode == localeCode,
                cancellationToken);

        if (translation is null)
        {
            translation = new CategoryTranslation
            {
                CategoryId = category.Id,
                LocaleCode = localeCode,
                CreatedAt = now
            };
            _context.CategoryTranslations.Add(translation);
        }

        ApplyPublishedFields(
            translation,
            name,
            description,
            ResolvePublishedSource(localeCode, defaultLocale, isManualEdit),
            category.ContentVersion,
            now);
    }

    private async Task UpsertMenuItemPrimaryLocaleAsync(
        MenuItem menuItem,
        string localeCode,
        string name,
        string? description,
        string defaultLocale,
        bool isManualEdit,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var translation = await _context.MenuItemTranslations
            .FirstOrDefaultAsync(
                item => item.MenuItemId == menuItem.Id && item.LocaleCode == localeCode,
                cancellationToken);

        if (translation is null)
        {
            translation = new MenuItemTranslation
            {
                MenuItemId = menuItem.Id,
                LocaleCode = localeCode,
                CreatedAt = now
            };
            _context.MenuItemTranslations.Add(translation);
        }

        ApplyPublishedFields(
            translation,
            name,
            description,
            ResolvePublishedSource(localeCode, defaultLocale, isManualEdit),
            menuItem.ContentVersion,
            now);
    }

    private async Task UpsertRestaurantPrimaryLocaleAsync(
        Restaurant restaurant,
        string localeCode,
        string name,
        string? description,
        string? address,
        string defaultLocale,
        bool isManualEdit,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var translation = await _context.RestaurantTranslations
            .FirstOrDefaultAsync(
                item => item.RestaurantId == restaurant.Id && item.LocaleCode == localeCode,
                cancellationToken);

        if (translation is null)
        {
            translation = new RestaurantTranslation
            {
                RestaurantId = restaurant.Id,
                LocaleCode = localeCode,
                CreatedAt = now
            };
            _context.RestaurantTranslations.Add(translation);
        }

        ApplyPublishedFields(
            translation,
            name,
            description,
            address,
            ResolvePublishedSource(localeCode, defaultLocale, isManualEdit),
            restaurant.ContentVersion,
            now);
    }

    private static void ApplyPublishedFields(
        RestaurantTranslation translation,
        string name,
        string? description,
        string? address,
        TranslationSource publishedSource,
        int contentVersion,
        DateTime approvedAt)
    {
        translation.Name = name.Trim();
        translation.Description = NormalizeOptional(description);
        translation.Address = NormalizeOptional(address);
        translation.PublishedSource = publishedSource;
        translation.PublishedSourceVersion = contentVersion;
        translation.ApprovedAt = approvedAt;
    }

    private static void ApplyPublishedFields(
        CategoryTranslation translation,
        string name,
        string? description,
        TranslationSource publishedSource,
        int contentVersion,
        DateTime approvedAt)
    {
        translation.Name = name.Trim();
        translation.Description = NormalizeOptional(description);
        translation.PublishedSource = publishedSource;
        translation.PublishedSourceVersion = contentVersion;
        translation.ApprovedAt = approvedAt;
    }

    private static void ApplyPublishedFields(
        MenuItemTranslation translation,
        string name,
        string? description,
        TranslationSource publishedSource,
        int contentVersion,
        DateTime approvedAt)
    {
        translation.Name = name.Trim();
        translation.Description = NormalizeOptional(description);
        translation.PublishedSource = publishedSource;
        translation.PublishedSourceVersion = contentVersion;
        translation.ApprovedAt = approvedAt;
    }

    private static TranslationSource ResolvePublishedSource(
        string localeCode,
        string defaultLocale,
        bool isManualEdit) =>
        !isManualEdit && string.Equals(localeCode, defaultLocale, StringComparison.Ordinal)
            ? TranslationSource.Original
            : TranslationSource.Manual;

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

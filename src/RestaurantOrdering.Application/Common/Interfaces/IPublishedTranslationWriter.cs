namespace RestaurantOrdering.Application.Common.Interfaces;

using RestaurantOrdering.Domain.Entities;

public interface IPublishedTranslationWriter
{
    Task EnsureLegacyBilingualWriteSupportedAsync(
        Guid restaurantId,
        CancellationToken cancellationToken);

    Task InitializeRegistrationCatalogAsync(
        Restaurant restaurant,
        CancellationToken cancellationToken);

    Task UpsertRestaurantPublishedTranslationsAsync(
        Restaurant restaurant,
        bool isManualEdit,
        CancellationToken cancellationToken);

    Task UpsertCategoryPublishedTranslationsAsync(
        Category category,
        bool isManualEdit,
        CancellationToken cancellationToken);

    Task UpsertMenuItemPublishedTranslationsAsync(
        MenuItem menuItem,
        bool isManualEdit,
        CancellationToken cancellationToken);

    Task<string> GetRestaurantDefaultLocaleAsync(
        Guid restaurantId,
        CancellationToken cancellationToken);

    Task UpsertCategoryPrimaryLocaleTranslationAsync(
        Category category,
        string localeCode,
        string name,
        string? description,
        bool isManualEdit,
        CancellationToken cancellationToken);

    Task UpsertMenuItemPrimaryLocaleTranslationAsync(
        MenuItem menuItem,
        string localeCode,
        string name,
        string? description,
        bool isManualEdit,
        CancellationToken cancellationToken);

    Task UpsertRestaurantPrimaryLocaleTranslationAsync(
        Restaurant restaurant,
        string localeCode,
        string name,
        string? description,
        string? address,
        bool isManualEdit,
        CancellationToken cancellationToken);
}

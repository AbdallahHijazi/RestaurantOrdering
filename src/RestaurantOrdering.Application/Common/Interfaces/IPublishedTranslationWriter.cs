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
}

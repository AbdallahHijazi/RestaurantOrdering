using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Restaurant> Restaurants { get; }
    DbSet<RestaurantSettings> RestaurantSettings { get; }
    DbSet<Customer> Customers { get; }
    DbSet<Category> Categories { get; }
    DbSet<MenuItem> MenuItems { get; }
    DbSet<Order> Orders { get; }
    DbSet<OrderItem> OrderItems { get; }
    DbSet<MediaFile> MediaFiles { get; }
    DbSet<QrCode> QrCodes { get; }
    DbSet<RestaurantTable> RestaurantTables { get; }
    DbSet<LocaleDefinition> LocaleDefinitions { get; }
    DbSet<RestaurantSupportedLocale> RestaurantSupportedLocales { get; }
    DbSet<RestaurantTranslation> RestaurantTranslations { get; }
    DbSet<CategoryTranslation> CategoryTranslations { get; }
    DbSet<MenuItemTranslation> MenuItemTranslations { get; }
    DbSet<TranslationJob> TranslationJobs { get; }
    DbSet<TranslationAuditLog> TranslationAuditLogs { get; }
    DbSet<RestaurantUserPermissionGrant> RestaurantUserPermissionGrants { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

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

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

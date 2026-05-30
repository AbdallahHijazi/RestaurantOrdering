using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Infrastructure.Identity;

namespace RestaurantOrdering.Infrastructure.Persistence;

public class ApplicationDbContext
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Restaurant> Restaurants => Set<Restaurant>();
    public DbSet<RestaurantSettings> RestaurantSettings => Set<RestaurantSettings>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<MediaFile> MediaFiles => Set<MediaFile>();
    public DbSet<QrCode> QrCodes => Set<QrCode>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
    }
}

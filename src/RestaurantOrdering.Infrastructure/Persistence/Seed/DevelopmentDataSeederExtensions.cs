using Microsoft.Extensions.DependencyInjection;

namespace RestaurantOrdering.Infrastructure.Persistence.Seed;

public static class DevelopmentDataSeederExtensions
{
    public static async Task SeedDevelopmentDataAsync(
        this IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var seeder = scope.ServiceProvider.GetRequiredService<DevelopmentDataSeeder>();
        await seeder.SeedAsync(cancellationToken);
    }
}

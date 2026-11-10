using Microsoft.Extensions.DependencyInjection;

namespace RestaurantOrdering.Infrastructure.Persistence.Seed;

public static class ApplicationRoleInitializerExtensions
{
    public static async Task InitializeApplicationRolesAsync(
        this IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var initializer = scope.ServiceProvider.GetRequiredService<ApplicationRoleInitializer>();
        await initializer.InitializeAsync(cancellationToken);
    }
}

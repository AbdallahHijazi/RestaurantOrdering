using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Infrastructure.Identity;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.Infrastructure.Persistence.Seed;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection.Extensions;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public class DevelopmentDataSeederTests
{
    private const string DevAdminEmail = "dev-admin@restaurantordering.local";
    private const string DevAdminPassword = "DevP@ssw0rd!2026";

    [Fact]
    public async Task SeedAsync_WithConfiguredCredentials_CreatesIdentityUserAndRestaurantLinks()
    {
        using var provider = await CreateSeederProviderAsync(
            new Dictionary<string, string?>
            {
                ["DevelopmentSeed:AdminEmail"] = DevAdminEmail,
                ["DevelopmentSeed:AdminPassword"] = DevAdminPassword,
                ["DevelopmentSeed:AdminFullName"] = "Local Dev Admin"
            });

        await SeedTwiceAsync(provider);

        using var scope = provider.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var owner = await userManager.FindByIdAsync(DevelopmentSeedIds.OwnerUserId.ToString());
        owner.Should().NotBeNull();
        owner!.Email.Should().Be(DevAdminEmail);
        owner.EmailConfirmed.Should().BeTrue();
        owner.IsActive.Should().BeTrue();
        owner.IsDeleted.Should().BeFalse();
        owner.LockoutEnabled.Should().BeTrue();
        owner.RestaurantId.Should().Be(DevelopmentSeedIds.RestaurantId);
        (await userManager.CheckPasswordAsync(owner, DevAdminPassword)).Should().BeTrue();

        var restaurant = await dbContext.Restaurants
            .IgnoreQueryFilters()
            .SingleAsync(item => item.Id == DevelopmentSeedIds.RestaurantId);

        restaurant.OwnerId.Should().Be(DevelopmentSeedIds.OwnerUserId);
        (await userManager.IsInRoleAsync(owner!, ApplicationRoles.RestaurantOwner)).Should().BeTrue();
    }

    [Fact]
    public async Task SeedAsync_WithConfiguredCredentials_IsIdempotentAndDoesNotResetPassword()
    {
        using var provider = await CreateSeederProviderAsync(
            new Dictionary<string, string?>
            {
                ["DevelopmentSeed:AdminEmail"] = DevAdminEmail,
                ["DevelopmentSeed:AdminPassword"] = DevAdminPassword
            });

        await SeedTwiceAsync(provider);

        using var scope = provider.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var userCount = await dbContext.Users.CountAsync();
        userCount.Should().Be(1);

        var owner = await userManager.FindByIdAsync(DevelopmentSeedIds.OwnerUserId.ToString());
        owner.Should().NotBeNull();
        (await userManager.CheckPasswordAsync(owner!, DevAdminPassword)).Should().BeTrue();
    }

    [Fact]
    public async Task SeedAsync_WithoutConfiguredCredentials_SkipsUserCreationWithoutFailing()
    {
        using var provider = await CreateSeederProviderAsync(new Dictionary<string, string?>());

        var act = async () => await SeedTwiceAsync(provider);

        await act.Should().NotThrowAsync();

        using var scope = provider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        (await dbContext.Users.CountAsync()).Should().Be(0);
        (await dbContext.Restaurants.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Login_WithSeededDevelopmentAdmin_ReturnsTokenAndRestaurantId()
    {
        await using var factory = new DevelopmentSeedWebApplicationFactory(
            new Dictionary<string, string?>
            {
                ["DevelopmentSeed:AdminEmail"] = DevAdminEmail,
                ["DevelopmentSeed:AdminPassword"] = DevAdminPassword
            });

        using var client = factory.CreateClient();

        var successResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { email = DevAdminEmail, password = DevAdminPassword });

        successResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var successPayload = await successResponse.Content.ReadFromJsonAsync<LoginResponseModel>(JsonOptions);
        successPayload.Should().NotBeNull();
        successPayload!.AccessToken.Should().NotBeNullOrWhiteSpace();
        successPayload.RestaurantId.Should().Be(DevelopmentSeedIds.RestaurantId);

        var wrongPasswordResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { email = DevAdminEmail, password = "WrongPassword!123" });

        wrongPasswordResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var errorBody = await wrongPasswordResponse.Content.ReadAsStringAsync();
        errorBody.Should().Contain("Invalid email or password.");
    }

    private static async Task SeedTwiceAsync(ServiceProvider provider)
    {
        await using var scope1 = provider.CreateAsyncScope();
        await scope1.ServiceProvider.GetRequiredService<DevelopmentDataSeeder>().SeedAsync();

        await using var scope2 = provider.CreateAsyncScope();
        await scope2.ServiceProvider.GetRequiredService<DevelopmentDataSeeder>().SeedAsync();
    }

    private static async Task<ServiceProvider> CreateSeederProviderAsync(
        IReadOnlyDictionary<string, string?> configurationValues)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IConfiguration>(
            new ConfigurationBuilder().AddInMemoryCollection(configurationValues).Build());

        var databaseName = $"development-seeder-tests-{Guid.NewGuid():N}";
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseInMemoryDatabase(databaseName));

        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(10);
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<ApplicationDbContext>();

        services.AddScoped<ApplicationRoleInitializer>();
        services.AddScoped<DevelopmentDataSeeder>();

        var provider = services.BuildServiceProvider();
        await provider.GetRequiredService<ApplicationDbContext>().Database.EnsureCreatedAsync();
        await provider.GetRequiredService<ApplicationRoleInitializer>().InitializeAsync();
        return provider;
    }

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private sealed class LoginResponseModel
    {
        public string AccessToken { get; set; } = string.Empty;
        public DateTime ExpiresAtUtc { get; set; }
        public Guid UserId { get; set; }
        public Guid? RestaurantId { get; set; }
    }

    private sealed class DevelopmentSeedWebApplicationFactory : WebApplicationFactory<Program>
    {
        private readonly string _databaseName = $"development-seeder-http-{Guid.NewGuid():N}";
        private readonly IReadOnlyDictionary<string, string?> _developmentSeedConfiguration;

        public DevelopmentSeedWebApplicationFactory(IReadOnlyDictionary<string, string?> developmentSeedConfiguration)
        {
            _developmentSeedConfiguration = developmentSeedConfiguration;
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");

            builder.ConfigureAppConfiguration((_, configBuilder) =>
            {
                configBuilder.AddInMemoryCollection(
                    new Dictionary<string, string?>
                    {
                        ["Jwt:Issuer"] = "RestaurantOrdering.Tests",
                        ["Jwt:Audience"] = "RestaurantOrdering.Tests.Client",
                        ["Jwt:SigningKey"] = "test-signing-key-at-least-32-characters-long!",
                        ["Jwt:AccessTokenLifetimeMinutes"] = "60",
                        ["FileStorage:RootPath"] = Path.Combine(
                            Path.GetTempPath(),
                            $"restaurant-ordering-dev-seed-{Guid.NewGuid():N}")
                    });

                configBuilder.AddInMemoryCollection(_developmentSeedConfiguration);
            });

            builder.ConfigureServices(services =>
            {
                services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
                services.RemoveAll<ApplicationDbContext>();
                services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();

                services.AddDbContext<ApplicationDbContext>(options =>
                    options.UseInMemoryDatabase(_databaseName));
            });
        }
    }
}

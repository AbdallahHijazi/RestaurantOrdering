using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using RestaurantOrdering.Infrastructure.Persistence;

namespace RestaurantOrdering.IntegrationTests.Infrastructure;

public sealed class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"restaurant-ordering-tests-{Guid.NewGuid()}";
    private readonly string _jwtIssuer;
    private readonly string _jwtAudience;
    private readonly string _jwtSigningKey;
    private readonly string _jwtAccessTokenLifetimeMinutes;
    private readonly string _uploadsRootPath;
    private readonly bool _useStrictRateLimits;

    public string UploadsRootPath => _uploadsRootPath;

    public TestWebApplicationFactory()
        : this(jwtSigningKey: null, useStrictRateLimits: false)
    {
    }

    private TestWebApplicationFactory(string? jwtSigningKey, bool useStrictRateLimits)
    {
        _useStrictRateLimits = useStrictRateLimits;
        _jwtIssuer = "RestaurantOrdering.Tests";
        _jwtAudience = "RestaurantOrdering.Tests.Client";
        _jwtSigningKey = jwtSigningKey ?? "test-signing-key-at-least-32-characters-long!";
        _jwtAccessTokenLifetimeMinutes = "60";
        _uploadsRootPath = Path.Combine(Path.GetTempPath(), $"restaurant-ordering-test-uploads-{Guid.NewGuid():N}");
    }

    public static TestWebApplicationFactory CreateWithSigningKey(string jwtSigningKey) =>
        new(jwtSigningKey, useStrictRateLimits: false);

    public static TestWebApplicationFactory CreateWithStrictRateLimits() =>
        new(jwtSigningKey: null, useStrictRateLimits: true);

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            configBuilder.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["Jwt:Issuer"] = _jwtIssuer,
                    ["Jwt:Audience"] = _jwtAudience,
                    ["Jwt:SigningKey"] = _jwtSigningKey,
                    ["Jwt:AccessTokenLifetimeMinutes"] = _jwtAccessTokenLifetimeMinutes,
                    ["FileStorage:RootPath"] = _uploadsRootPath,
                    ["Testing:UseStrictRateLimits"] = _useStrictRateLimits ? "true" : "false"
                });
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.RemoveAll<ApplicationDbContext>();
            services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();

            services.AddDbContext<ApplicationDbContext>(options =>
                options
                    .UseInMemoryDatabase(_databaseName)
                    .ConfigureWarnings(warnings =>
                        warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning)));
        });
    }

    protected override void Dispose(bool disposing)
    {
        if (Directory.Exists(_uploadsRootPath))
        {
            Directory.Delete(_uploadsRootPath, recursive: true);
        }

        base.Dispose(disposing);
    }
}


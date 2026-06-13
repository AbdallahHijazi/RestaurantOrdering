using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.IntegrationTests.Infrastructure;

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
    private readonly bool _workerEnabled;
    private readonly int _workerBatchSize;
    private readonly int _workerPollingIntervalSeconds;

    public string UploadsRootPath => _uploadsRootPath;

    public TestWebApplicationFactory()
        : this(jwtSigningKey: null, useStrictRateLimits: false, workerEnabled: false)
    {
    }

    private TestWebApplicationFactory(
        string? jwtSigningKey,
        bool useStrictRateLimits,
        bool workerEnabled,
        int workerBatchSize = 10,
        int workerPollingIntervalSeconds = 10)
    {
        _useStrictRateLimits = useStrictRateLimits;
        _workerEnabled = workerEnabled;
        _workerBatchSize = workerBatchSize;
        _workerPollingIntervalSeconds = workerPollingIntervalSeconds;
        _jwtIssuer = "RestaurantOrdering.Tests";
        _jwtAudience = "RestaurantOrdering.Tests.Client";
        _jwtSigningKey = jwtSigningKey ?? "test-signing-key-at-least-32-characters-long!";
        _jwtAccessTokenLifetimeMinutes = "60";
        _uploadsRootPath = Path.Combine(Path.GetTempPath(), $"restaurant-ordering-test-uploads-{Guid.NewGuid():N}");
    }

    public static TestWebApplicationFactory CreateWithSigningKey(string jwtSigningKey) =>
        new(jwtSigningKey, useStrictRateLimits: false, workerEnabled: false);

    public static TestWebApplicationFactory CreateWithStrictRateLimits() =>
        new(jwtSigningKey: null, useStrictRateLimits: true, workerEnabled: false);

    public static TestWebApplicationFactory CreateWithWorkerEnabled(
        int batchSize = 10,
        int pollingIntervalSeconds = 10) =>
        new(
            jwtSigningKey: null,
            useStrictRateLimits: false,
            workerEnabled: true,
            workerBatchSize: batchSize,
            workerPollingIntervalSeconds: pollingIntervalSeconds);

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
                    ["Testing:UseStrictRateLimits"] = _useStrictRateLimits ? "true" : "false",
                    ["TranslationWorker:Enabled"] = _workerEnabled ? "true" : "false",
                    ["TranslationWorker:PollingIntervalSeconds"] = _workerPollingIntervalSeconds.ToString(),
                    ["TranslationWorker:BatchSize"] = _workerBatchSize.ToString(),
                    ["TranslationWorker:LeaseDurationSeconds"] = "120"
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

            services.RemoveAll<ITranslationProvider>();
            services.AddSingleton<ITranslationProvider, FakeTranslationProvider>();
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


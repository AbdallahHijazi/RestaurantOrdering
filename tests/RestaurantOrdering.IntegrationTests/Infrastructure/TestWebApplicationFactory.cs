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
using RestaurantOrdering.Infrastructure.Translation;
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
    private readonly bool _useFakeTranslationProvider;
    private readonly HttpMessageHandler? _azureHttpHandler;
    private readonly Action<Dictionary<string, string?>>? _configureConfiguration;

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
        int workerPollingIntervalSeconds = 10,
        bool useFakeTranslationProvider = true,
        HttpMessageHandler? azureHttpHandler = null,
        Action<Dictionary<string, string?>>? configureConfiguration = null)
    {
        _useStrictRateLimits = useStrictRateLimits;
        _workerEnabled = workerEnabled;
        _workerBatchSize = workerBatchSize;
        _workerPollingIntervalSeconds = workerPollingIntervalSeconds;
        _useFakeTranslationProvider = useFakeTranslationProvider;
        _azureHttpHandler = azureHttpHandler;
        _configureConfiguration = configureConfiguration;
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

    public static TestWebApplicationFactory CreateForProviderSelection(
        bool useFakeTranslationProvider,
        Action<Dictionary<string, string?>>? configure = null) =>
        new(
            jwtSigningKey: null,
            useStrictRateLimits: false,
            workerEnabled: false,
            useFakeTranslationProvider: useFakeTranslationProvider,
            configureConfiguration: configure);

    public static TestWebApplicationFactory CreateWithAzureTranslator(HttpMessageHandler httpHandler) =>
        new(
            jwtSigningKey: null,
            useStrictRateLimits: false,
            workerEnabled: false,
            useFakeTranslationProvider: false,
            azureHttpHandler: httpHandler,
            configureConfiguration: config =>
            {
                config["TranslationProvider:Provider"] = TranslationProviderNames.AzureTranslator;
                config["TranslationProvider:AzureTranslator:Endpoint"] = "https://fake-translator.test";
                config["TranslationProvider:AzureTranslator:SubscriptionKey"] =
                    AzureTranslatorProviderTestFactory.TestSubscriptionKey;
                config["TranslationProvider:AzureTranslator:TimeoutSeconds"] = "30";
                config["TranslationProvider:AzureTranslator:Region"] = string.Empty;
            });

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            var configuration = new Dictionary<string, string?>
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
                ["TranslationWorker:LeaseDurationSeconds"] = "120",
                ["TranslationProvider:Provider"] = TranslationProviderNames.NoOp,
                ["TranslationProvider:AzureTranslator:Endpoint"] = "https://api.cognitive.microsofttranslator.com",
                ["TranslationProvider:AzureTranslator:Region"] = string.Empty,
                ["TranslationProvider:AzureTranslator:TimeoutSeconds"] = "30"
            };

            _configureConfiguration?.Invoke(configuration);
            configBuilder.AddInMemoryCollection(configuration);
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

            if (_azureHttpHandler is not null)
            {
                services.AddHttpClient(AzureTranslatorProvider.HttpClientName)
                    .ConfigurePrimaryHttpMessageHandler(() => _azureHttpHandler);
            }

            if (_useFakeTranslationProvider)
            {
                services.RemoveAll<ITranslationProvider>();
                services.AddSingleton<ITranslationProvider, FakeTranslationProvider>();
            }
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


using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Translation;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.Infrastructure.Translation;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using System.Net;
using System.Text;
using System.Text.Json;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class AzureTranslatorProviderTests
{
    [Fact]
    public async Task SuccessResponse_MapsTranslatedFieldsByKey()
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                AzureTranslatorTestResponses.Success("English name", "English description", "English address"),
                Encoding.UTF8,
                "application/json")
        });

        var provider = AzureTranslatorProviderTestFactory.CreateProvider(handler);
        var result = await provider.TranslateAsync(
            AzureTranslatorProviderTestFactory.CreateRequest(),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.TranslatedFields!.Name.Should().Be("English name");
        result.TranslatedFields.Description.Should().Be("English description");
        result.TranslatedFields.Address.Should().Be("English address");
        result.FailedFieldKeys.Should().BeEmpty();
    }

    [Fact]
    public async Task NullOrEmptyOptionalFields_AreNotSentToAzure()
    {
        string? capturedBody = null;
        var handler = new StubHttpMessageHandler(request =>
        {
            capturedBody = request.Content!.ReadAsStringAsync().GetAwaiter().GetResult();
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    AzureTranslatorTestResponses.Success("English name"),
                    Encoding.UTF8,
                    "application/json")
            };
        });

        var provider = AzureTranslatorProviderTestFactory.CreateProvider(handler);
        var result = await provider.TranslateAsync(
            AzureTranslatorProviderTestFactory.CreateRequest(description: null, address: "   "),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        capturedBody.Should().NotBeNull();

        using var document = JsonDocument.Parse(capturedBody!);
        document.RootElement.GetArrayLength().Should().Be(1);
        document.RootElement[0].GetProperty("Text").GetString().Should().Be("Arabic name");
    }

    [Fact]
    public async Task RegionHeader_IsSentWhenRegionConfigured()
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                AzureTranslatorTestResponses.Success("English name"),
                Encoding.UTF8,
                "application/json")
        });

        var provider = AzureTranslatorProviderTestFactory.CreateProvider(handler, region: "westeurope");
        await provider.TranslateAsync(
            AzureTranslatorProviderTestFactory.CreateRequest(description: null, address: null),
            CancellationToken.None);

        handler.LastRequest!.Headers.Contains("Ocp-Apim-Subscription-Region").Should().BeTrue();
        handler.LastRequest.Headers.GetValues("Ocp-Apim-Subscription-Region").Single().Should().Be("westeurope");
    }

    [Fact]
    public async Task RegionHeader_IsNotSentWhenRegionEmpty()
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                AzureTranslatorTestResponses.Success("English name"),
                Encoding.UTF8,
                "application/json")
        });

        var provider = AzureTranslatorProviderTestFactory.CreateProvider(handler, region: string.Empty);
        await provider.TranslateAsync(
            AzureTranslatorProviderTestFactory.CreateRequest(description: null, address: null),
            CancellationToken.None);

        handler.LastRequest!.Headers.Contains("Ocp-Apim-Subscription-Region").Should().BeFalse();
    }

    [Fact]
    public async Task SubscriptionKeyHeader_IsSentWithoutAppearingInLogs()
    {
        var logMessages = new List<string>();
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                AzureTranslatorTestResponses.Success("English name"),
                Encoding.UTF8,
                "application/json")
        });

        var logger = new CollectingLogger<AzureTranslatorProvider>(logMessages);
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://fake-translator.test/"),
            Timeout = TimeSpan.FromSeconds(30)
        };

        var provider = new AzureTranslatorProvider(
            new SingleHttpClientFactory(httpClient),
            Options.Create(new AzureTranslatorOptions
            {
                Endpoint = "https://fake-translator.test",
                SubscriptionKey = AzureTranslatorProviderTestFactory.TestSubscriptionKey,
                TimeoutSeconds = 30
            }),
            logger);

        await provider.TranslateAsync(
            AzureTranslatorProviderTestFactory.CreateRequest(description: null, address: null),
            CancellationToken.None);

        handler.LastRequest!.Headers.GetValues("Ocp-Apim-Subscription-Key").Single()
            .Should().Be(AzureTranslatorProviderTestFactory.TestSubscriptionKey);
        logMessages.Should().NotContain(message => message.Contains(AzureTranslatorProviderTestFactory.TestSubscriptionKey));
        logMessages.Should().NotContain(message => message.Contains("Ocp-Apim-Subscription-Key"));
    }

    [Theory]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.Forbidden)]
    public async Task UnauthorizedResponses_ReturnSafeFailure(HttpStatusCode statusCode)
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(statusCode));
        var provider = AzureTranslatorProviderTestFactory.CreateProvider(handler);

        var result = await provider.TranslateAsync(
            AzureTranslatorProviderTestFactory.CreateRequest(),
            CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be(AzureTranslatorErrorCodes.Unauthorized);
        result.ErrorMessage.Should().NotContain(AzureTranslatorProviderTestFactory.TestSubscriptionKey);
    }

    [Fact]
    public async Task TooManyRequests_ReturnsRetryableSafeFailure()
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.TooManyRequests));
        var provider = AzureTranslatorProviderTestFactory.CreateProvider(handler);

        var result = await provider.TranslateAsync(
            AzureTranslatorProviderTestFactory.CreateRequest(),
            CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be(AzureTranslatorErrorCodes.Throttled);
    }

    [Fact]
    public async Task ServerError_ReturnsSafeFailure()
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.InternalServerError));
        var provider = AzureTranslatorProviderTestFactory.CreateProvider(handler);

        var result = await provider.TranslateAsync(
            AzureTranslatorProviderTestFactory.CreateRequest(),
            CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be(AzureTranslatorErrorCodes.ServerError);
    }

    [Fact]
    public async Task MalformedJson_ReturnsSafeFailure()
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("{not-json", Encoding.UTF8, "application/json")
        });

        var provider = AzureTranslatorProviderTestFactory.CreateProvider(handler);

        var result = await provider.TranslateAsync(
            AzureTranslatorProviderTestFactory.CreateRequest(description: null, address: null),
            CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be(AzureTranslatorErrorCodes.MalformedResponse);
    }

    [Fact]
    public async Task ItemCountMismatch_ReturnsSafeFailure()
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                AzureTranslatorTestResponses.Success("Only one item"),
                Encoding.UTF8,
                "application/json")
        });

        var provider = AzureTranslatorProviderTestFactory.CreateProvider(handler);

        var result = await provider.TranslateAsync(
            AzureTranslatorProviderTestFactory.CreateRequest(),
            CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be(AzureTranslatorErrorCodes.ItemCountMismatch);
    }

    [Fact]
    public async Task EmptyTranslatedField_ReturnsFailedFieldKey()
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                AzureTranslatorTestResponses.Success("English name", " ", "English address"),
                Encoding.UTF8,
                "application/json")
        });

        var provider = AzureTranslatorProviderTestFactory.CreateProvider(handler);

        var result = await provider.TranslateAsync(
            AzureTranslatorProviderTestFactory.CreateRequest(),
            CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be(AzureTranslatorErrorCodes.PartialFailure);
        result.FailedFieldKeys.Should().Contain("description");
    }

    [Fact]
    public async Task Timeout_ReturnsSafeFailure()
    {
        var handler = new StubHttpMessageHandler(async (_, cancellationToken) =>
        {
            await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });

        var provider = AzureTranslatorProviderTestFactory.CreateProvider(handler, timeoutSeconds: 1);

        var result = await provider.TranslateAsync(
            AzureTranslatorProviderTestFactory.CreateRequest(description: null, address: null),
            CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be(AzureTranslatorErrorCodes.Timeout);
    }

    [Fact]
    public async Task Processor_WithAzureSuccess_WritesDraftFieldsOnly()
    {
        await using var factory = TestWebApplicationFactory.CreateWithAzureTranslator(
            new StubHttpMessageHandler(request =>
            {
                var body = request.Content!.ReadAsStringAsync().GetAwaiter().GetResult();
                using var document = JsonDocument.Parse(body);
                var translatedTexts = Enumerable
                    .Range(0, document.RootElement.GetArrayLength())
                    .Select(index => index == 0 ? "Draft name" : $"Draft field {index}")
                    .ToArray();

                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        AzureTranslatorTestResponses.Success(translatedTexts),
                        Encoding.UTF8,
                        "application/json")
                };
            }));

        await TestDataSeeder.SeedAsync(factory.Services);
        await ConfigureTranslationJobsAsync(factory.Services);

        var jobId = await SeedQueuedCategoryJobAsync(factory.Services);

        using var scope = factory.Services.CreateScope();
        var processor = scope.ServiceProvider.GetRequiredService<ITranslationJobProcessor>();
        var result = await processor.ProcessJobAsync(jobId, CancellationToken.None);

        result.Outcome.Should().Be("Succeeded");

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var translation = await context.CategoryTranslations
            .AsNoTracking()
            .SingleAsync(item => item.CategoryId == TestDataSeeder.CategoryAId && item.LocaleCode == "en");

        translation.DraftName.Should().Be("Draft name");
        translation.DraftDescription.Should().BeNull();
        translation.DraftStatus.Should().Be(TranslationStatus.NeedsReview);
        translation.Name.Should().BeNull();
        translation.Description.Should().BeNull();
    }

    [Fact]
    public async Task Processor_WithAzureFailure_SchedulesRetry()
    {
        await using var factory = TestWebApplicationFactory.CreateWithAzureTranslator(
            new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.TooManyRequests)));

        await TestDataSeeder.SeedAsync(factory.Services);
        await ConfigureTranslationJobsAsync(factory.Services);

        var jobId = await SeedQueuedCategoryJobAsync(factory.Services);

        using var scope = factory.Services.CreateScope();
        var processor = scope.ServiceProvider.GetRequiredService<ITranslationJobProcessor>();
        var result = await processor.ProcessJobAsync(jobId, CancellationToken.None);

        result.Outcome.Should().Be("Failed");

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var job = await context.TranslationJobs.AsNoTracking().SingleAsync(item => item.Id == jobId);
        job.Status.Should().Be(TranslationJobStatus.Queued);
        job.AttemptCount.Should().Be(1);
        job.NextAttemptAt.Should().NotBeNull();
        job.LastError.Should().Contain("rate limit");
    }

    [Fact]
    public void NoSecretsInAppsettingsOrAzureProviderSource()
    {
        var appsettingsPath = Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "..", "..", "..", "..", "..",
            "src", "RestaurantOrdering.Api", "appsettings.json"));
        var providerPath = Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "..", "..", "..", "..", "..",
            "src", "RestaurantOrdering.Infrastructure", "Translation", "AzureTranslatorProvider.cs"));

        var appsettings = File.ReadAllText(appsettingsPath);
        appsettings.Should().NotContain("SubscriptionKey");
        appsettings.Should().NotContain(AzureTranslatorProviderTestFactory.TestSubscriptionKey);

        var providerSource = File.ReadAllText(providerPath);
        providerSource.Should().NotContain("sk-");
        providerSource.Should().NotMatchRegex(@"[0-9a-f]{32}");
    }

    private static async Task ConfigureTranslationJobsAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var settings = await context.RestaurantSettings.SingleAsync(item => item.RestaurantId == TestDataSeeder.RestaurantAId);
        settings.DefaultLocale = "ar";
        settings.TranslationMode = TranslationMode.AutoGenerateDrafts;

        foreach (var (code, isEnabled, sortOrder) in new (string Code, bool IsEnabled, int SortOrder)[]
        {
            ("ar", true, 1),
            ("en", true, 2)
        })
        {
            var locale = await context.RestaurantSupportedLocales
                .SingleOrDefaultAsync(item => item.RestaurantId == TestDataSeeder.RestaurantAId && item.LocaleCode == code);

            if (locale is null)
            {
                context.RestaurantSupportedLocales.Add(new RestaurantSupportedLocale
                {
                    RestaurantId = TestDataSeeder.RestaurantAId,
                    LocaleCode = code,
                    IsEnabled = isEnabled,
                    SortOrder = sortOrder
                });
            }
            else
            {
                locale.IsEnabled = isEnabled;
                locale.SortOrder = sortOrder;
            }
        }

        await context.SaveChangesAsync();
    }

    private static async Task<Guid> SeedQueuedCategoryJobAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var category = await context.Categories.AsNoTracking().SingleAsync(item => item.Id == TestDataSeeder.CategoryAId);
        var now = DateTime.UtcNow;
        var jobId = Guid.NewGuid();

        context.TranslationJobs.Add(new TranslationJob
        {
            Id = jobId,
            RestaurantId = TestDataSeeder.RestaurantAId,
            EntityType = TranslatableEntityType.Category,
            EntityId = TestDataSeeder.CategoryAId,
            TargetLocaleCode = "en",
            SourceLocaleCode = "ar",
            SourceVersion = category.ContentVersion,
            Status = TranslationJobStatus.Queued,
            IdempotencyKey = $"{TranslatableEntityType.Category}:{TestDataSeeder.CategoryAId:N}:en:{category.ContentVersion}",
            CreatedAt = now
        });

        await context.SaveChangesAsync();
        return jobId;
    }

    private sealed class CollectingLogger<T> : ILogger<T>
    {
        private readonly List<string> _messages;

        public CollectingLogger(List<string> messages) => _messages = messages;

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter) =>
            _messages.Add(formatter(state, exception));
    }
}

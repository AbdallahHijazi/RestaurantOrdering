using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Translation;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.Infrastructure.Translation;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class TranslationJobWorkerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public TranslationJobWorkerTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task WorkerDisabled_DoesNotProcessQueuedJobs()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        var jobId = await SeedQueuedCategoryJobAsync(
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.CategoryAId,
            "en");

        using var scope = _factory.Services.CreateScope();
        var executor = scope.ServiceProvider.GetRequiredService<ITranslationJobWorkerExecutor>();

        var processedCount = await executor.ProcessAvailableJobsAsync(CancellationToken.None);
        processedCount.Should().Be(0);

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var job = await context.TranslationJobs.AsNoTracking().SingleAsync(item => item.Id == jobId);
        job.Status.Should().Be(TranslationJobStatus.Queued);
    }

    [Fact]
    public async Task WorkerEnabled_ProcessesQueuedJob()
    {
        await using var factory = TestWebApplicationFactory.CreateWithWorkerEnabled();
        await TestDataSeeder.SeedAsync(factory.Services);
        ResetFakeProvider(factory.Services);

        var jobId = await SeedQueuedCategoryJobAsync(
            factory.Services,
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.CategoryAId,
            "en");

        using var scope = factory.Services.CreateScope();
        var executor = scope.ServiceProvider.GetRequiredService<ITranslationJobWorkerExecutor>();

        var processedCount = await executor.ProcessAvailableJobsAsync(CancellationToken.None);
        processedCount.Should().Be(1);

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var job = await context.TranslationJobs.AsNoTracking().SingleAsync(item => item.Id == jobId);
        job.Status.Should().Be(TranslationJobStatus.Succeeded);

        var translation = await context.CategoryTranslations
            .AsNoTracking()
            .SingleAsync(item => item.CategoryId == TestDataSeeder.CategoryAId && item.LocaleCode == "en");
        translation.DraftStatus.Should().Be(TranslationStatus.NeedsReview);
        translation.DraftName.Should().StartWith("[en]");
    }

    [Fact]
    public async Task WorkerEnabled_NextAttemptAtInFuture_DoesNotProcessJob()
    {
        await using var factory = TestWebApplicationFactory.CreateWithWorkerEnabled();
        await TestDataSeeder.SeedAsync(factory.Services);

        var jobId = await SeedQueuedCategoryJobAsync(
            factory.Services,
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.CategoryAId,
            "en",
            nextAttemptAt: DateTime.UtcNow.AddHours(1));

        using var scope = factory.Services.CreateScope();
        var executor = scope.ServiceProvider.GetRequiredService<ITranslationJobWorkerExecutor>();

        var processedCount = await executor.ProcessAvailableJobsAsync(CancellationToken.None);
        processedCount.Should().Be(0);

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var job = await context.TranslationJobs.AsNoTracking().SingleAsync(item => item.Id == jobId);
        job.Status.Should().Be(TranslationJobStatus.Queued);
    }

    [Fact]
    public async Task WorkerEnabled_RunningJob_IsNotProcessedAgain()
    {
        await using var factory = TestWebApplicationFactory.CreateWithWorkerEnabled();
        await TestDataSeeder.SeedAsync(factory.Services);

        var jobId = await SeedQueuedCategoryJobAsync(
            factory.Services,
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.CategoryAId,
            "en",
            status: TranslationJobStatus.Running,
            leaseExpiresAt: DateTime.UtcNow.AddMinutes(5));

        using var scope = factory.Services.CreateScope();
        var executor = scope.ServiceProvider.GetRequiredService<ITranslationJobWorkerExecutor>();

        var processedCount = await executor.ProcessAvailableJobsAsync(CancellationToken.None);
        processedCount.Should().Be(0);

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var job = await context.TranslationJobs.AsNoTracking().SingleAsync(item => item.Id == jobId);
        job.Status.Should().Be(TranslationJobStatus.Running);
    }

    [Fact]
    public async Task WorkerEnabled_RespectsBatchSize()
    {
        await using var factory = TestWebApplicationFactory.CreateWithWorkerEnabled(batchSize: 3);
        await TestDataSeeder.SeedAsync(factory.Services);
        ResetFakeProvider(factory.Services);

        await SeedQueuedCategoryJobAsync(factory.Services, TestDataSeeder.RestaurantAId, TestDataSeeder.CategoryAId, "en");
        await SeedQueuedCategoryJobAsync(factory.Services, TestDataSeeder.RestaurantAId, TestDataSeeder.CategoryAId, "fr");
        await SeedQueuedCategoryJobAsync(factory.Services, TestDataSeeder.RestaurantAId, TestDataSeeder.CategoryAId, "de");
        await SeedQueuedCategoryJobAsync(factory.Services, TestDataSeeder.RestaurantAId, TestDataSeeder.CategoryAId, "es");
        await SeedQueuedCategoryJobAsync(factory.Services, TestDataSeeder.RestaurantAId, TestDataSeeder.CategoryAId, "it");

        using var scope = factory.Services.CreateScope();
        var executor = scope.ServiceProvider.GetRequiredService<ITranslationJobWorkerExecutor>();

        var firstBatchCount = await executor.ProcessAvailableJobsAsync(CancellationToken.None);
        firstBatchCount.Should().Be(3);

        var secondBatchCount = await executor.ProcessAvailableJobsAsync(CancellationToken.None);
        secondBatchCount.Should().Be(2);

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await context.TranslationJobs.CountAsync(item => item.Status == TranslationJobStatus.Queued))
            .Should().Be(0);
    }

    [Fact]
    public async Task WorkerEnabled_ProviderFailure_SchedulesRetryCorrectly()
    {
        await using var factory = TestWebApplicationFactory.CreateWithWorkerEnabled();
        await TestDataSeeder.SeedAsync(factory.Services);
        SetFakeProviderFailure(factory.Services, shouldFail: true);

        var jobId = await SeedQueuedCategoryJobAsync(
            factory.Services,
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.CategoryAId,
            "en");

        using var scope = factory.Services.CreateScope();
        var executor = scope.ServiceProvider.GetRequiredService<ITranslationJobWorkerExecutor>();

        var processedCount = await executor.ProcessAvailableJobsAsync(CancellationToken.None);
        processedCount.Should().Be(1);

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var job = await context.TranslationJobs.AsNoTracking().SingleAsync(item => item.Id == jobId);
        job.Status.Should().Be(TranslationJobStatus.Queued);
        job.AttemptCount.Should().Be(1);
        job.NextAttemptAt.Should().NotBeNull();
        job.LastError.Should().NotBeNullOrWhiteSpace();
        job.ClaimedAt.Should().BeNull();
        job.LeaseExpiresAt.Should().BeNull();
        job.WorkerId.Should().BeNull();
    }

    [Fact]
    public async Task WorkerCancellation_StopsWithoutError()
    {
        await using var factory = TestWebApplicationFactory.CreateWithWorkerEnabled(pollingIntervalSeconds: 1);
        var worker = factory.Services.GetServices<IHostedService>()
            .OfType<TranslationJobWorker>()
            .Single();

        using var cts = new CancellationTokenSource();
        await worker.StartAsync(cts.Token);
        cts.CancelAfter(TimeSpan.FromMilliseconds(150));

        var stopAction = async () => await worker.StopAsync(CancellationToken.None);
        await stopAction.Should().NotThrowAsync();
    }

    [Fact]
    public async Task WorkerEnabled_DoesNotProcessSameJobTwiceSequentially()
    {
        await using var factory = TestWebApplicationFactory.CreateWithWorkerEnabled();
        await TestDataSeeder.SeedAsync(factory.Services);
        ResetFakeProvider(factory.Services);

        var jobId = await SeedQueuedCategoryJobAsync(
            factory.Services,
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.CategoryAId,
            "en");

        using var scope = factory.Services.CreateScope();
        var executor = scope.ServiceProvider.GetRequiredService<ITranslationJobWorkerExecutor>();

        var firstBatchCount = await executor.ProcessAvailableJobsAsync(CancellationToken.None);
        var secondBatchCount = await executor.ProcessAvailableJobsAsync(CancellationToken.None);

        firstBatchCount.Should().Be(1);
        secondBatchCount.Should().Be(0);

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var job = await context.TranslationJobs.AsNoTracking().SingleAsync(item => item.Id == jobId);
        job.Status.Should().Be(TranslationJobStatus.Succeeded);
        job.ClaimedAt.Should().BeNull();
        job.LeaseExpiresAt.Should().BeNull();
        job.WorkerId.Should().BeNull();
    }

    [Fact]
    public void NoApiKeysWereAddedForTranslationWorker()
    {
        var appsettingsPath = Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "..", "..", "..", "..", "..",
            "src", "RestaurantOrdering.Api", "appsettings.json"));

        var json = File.ReadAllText(appsettingsPath);
        json.Should().NotContain("ApiKey", "translation worker must not introduce API keys");
        json.Should().NotContain("apiKey");
    }

    [Fact]
    public void InfrastructureRegistersNoOpTranslationProviderByDefault_NotExternalProvider()
    {
        var dependencyInjectionPath = Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "..", "..", "..", "..", "..",
            "src", "RestaurantOrdering.Infrastructure", "DependencyInjection.cs"));

        var content = File.ReadAllText(dependencyInjectionPath);
        content.Should().Contain("NoOpTranslationProvider");
        content.Should().Contain("AzureTranslatorProvider");
        content.Should().NotContain("Google");
        content.Should().NotContain("DeepL");
    }

    private async Task<Guid> SeedQueuedCategoryJobAsync(
        Guid restaurantId,
        Guid categoryId,
        string targetLocale,
        DateTime? nextAttemptAt = null,
        TranslationJobStatus status = TranslationJobStatus.Queued) =>
        await SeedQueuedCategoryJobAsync(
            _factory.Services,
            restaurantId,
            categoryId,
            targetLocale,
            nextAttemptAt,
            status);

    private static async Task<Guid> SeedQueuedCategoryJobAsync(
        IServiceProvider services,
        Guid restaurantId,
        Guid categoryId,
        string targetLocale,
        DateTime? nextAttemptAt = null,
        TranslationJobStatus status = TranslationJobStatus.Queued,
        DateTime? leaseExpiresAt = null,
        string? workerId = null)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var category = await context.Categories.AsNoTracking().SingleAsync(item => item.Id == categoryId);
        var now = DateTime.UtcNow;
        var jobId = Guid.NewGuid();

        context.TranslationJobs.Add(new TranslationJob
        {
            Id = jobId,
            RestaurantId = restaurantId,
            EntityType = TranslatableEntityType.Category,
            EntityId = categoryId,
            TargetLocaleCode = targetLocale,
            SourceLocaleCode = "ar",
            SourceVersion = category.ContentVersion,
            Status = status,
            NextAttemptAt = nextAttemptAt,
            ClaimedAt = status == TranslationJobStatus.Running ? now : null,
            LeaseExpiresAt = leaseExpiresAt,
            WorkerId = workerId,
            IdempotencyKey = $"{TranslatableEntityType.Category}:{categoryId:N}:{targetLocale}:{category.ContentVersion}",
            CreatedAt = now
        });

        await context.SaveChangesAsync();
        return jobId;
    }

    private static void ResetFakeProvider(IServiceProvider services)
    {
        var provider = services.GetRequiredService<ITranslationProvider>();
        if (provider is FakeTranslationProvider fakeProvider)
        {
            fakeProvider.Reset();
        }
    }

    private static void SetFakeProviderFailure(IServiceProvider services, bool shouldFail)
    {
        var provider = services.GetRequiredService<ITranslationProvider>();
        if (provider is FakeTranslationProvider fakeProvider)
        {
            fakeProvider.ShouldFail = shouldFail;
        }
    }
}

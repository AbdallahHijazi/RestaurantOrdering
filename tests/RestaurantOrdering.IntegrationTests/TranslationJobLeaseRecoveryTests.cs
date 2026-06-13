using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.Infrastructure.Translation;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class TranslationJobLeaseRecoveryTests : IClassFixture<TestWebApplicationFactory>
{
    private const string StaleWorkerId = "stale-worker-a";
    private const string ReclaimWorkerId = "reclaim-worker-b";

    private readonly TestWebApplicationFactory _factory;

    public TranslationJobLeaseRecoveryTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Claim_SetsRunningClaimedAtLeaseExpiresAtAndWorkerId()
    {
        await using var factory = TestWebApplicationFactory.CreateWithWorkerEnabled();
        await TestDataSeeder.SeedAsync(factory.Services);

        var jobId = await SeedCategoryJobAsync(
            factory.Services,
            TranslationJobStatus.Queued);

        using var scope = factory.Services.CreateScope();
        var claimService = scope.ServiceProvider.GetRequiredService<ITranslationJobClaimService>();
        var workerIdentity = scope.ServiceProvider.GetRequiredService<ITranslationJobWorkerIdentity>();
        var dateTimeService = scope.ServiceProvider.GetRequiredService<IDateTimeService>();

        var claimed = await claimService.ClaimReadyJobsAsync(
            batchSize: 1,
            dateTimeService.UtcNow,
            CancellationToken.None);

        claimed.Should().ContainSingle();
        claimed[0].JobId.Should().Be(jobId);
        claimed[0].WorkerId.Should().Be(workerIdentity.WorkerId);

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var job = await context.TranslationJobs.AsNoTracking().SingleAsync(item => item.Id == jobId);
        job.Status.Should().Be(TranslationJobStatus.Running);
        job.ClaimedAt.Should().NotBeNull();
        job.LeaseExpiresAt.Should().NotBeNull();
        job.LeaseExpiresAt.Should().BeAfter(job.ClaimedAt!.Value);
        job.WorkerId.Should().Be(workerIdentity.WorkerId);
    }

    [Fact]
    public async Task RunningJob_WithActiveLease_IsNotReclaimed()
    {
        await using var factory = TestWebApplicationFactory.CreateWithWorkerEnabled();
        await TestDataSeeder.SeedAsync(factory.Services);

        await SeedCategoryJobAsync(
            factory.Services,
            TranslationJobStatus.Running,
            leaseExpiresAt: DateTime.UtcNow.AddMinutes(5),
            workerId: StaleWorkerId);

        using var scope = factory.Services.CreateScope();
        var claimService = scope.ServiceProvider.GetRequiredService<ITranslationJobClaimService>();
        var dateTimeService = scope.ServiceProvider.GetRequiredService<IDateTimeService>();

        var claimed = await claimService.ClaimReadyJobsAsync(
            batchSize: 1,
            dateTimeService.UtcNow,
            CancellationToken.None);

        claimed.Should().BeEmpty();
    }

    [Fact]
    public async Task RunningJob_WithExpiredLease_IsReclaimed()
    {
        await using var factory = TestWebApplicationFactory.CreateWithWorkerEnabled();
        await TestDataSeeder.SeedAsync(factory.Services);

        var jobId = await SeedCategoryJobAsync(
            factory.Services,
            TranslationJobStatus.Running,
            leaseExpiresAt: DateTime.UtcNow.AddMinutes(-1),
            workerId: StaleWorkerId);

        using var scope = factory.Services.CreateScope();
        var claimService = scope.ServiceProvider.GetRequiredService<ITranslationJobClaimService>();
        var workerIdentity = scope.ServiceProvider.GetRequiredService<ITranslationJobWorkerIdentity>();
        var dateTimeService = scope.ServiceProvider.GetRequiredService<IDateTimeService>();

        var claimed = await claimService.ClaimReadyJobsAsync(
            batchSize: 1,
            dateTimeService.UtcNow,
            CancellationToken.None);

        claimed.Should().ContainSingle();
        claimed[0].JobId.Should().Be(jobId);
        claimed[0].WorkerId.Should().Be(workerIdentity.WorkerId);

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var job = await context.TranslationJobs.AsNoTracking().SingleAsync(item => item.Id == jobId);
        job.Status.Should().Be(TranslationJobStatus.Running);
        job.WorkerId.Should().Be(workerIdentity.WorkerId);
        job.WorkerId.Should().NotBe(StaleWorkerId);
        job.LeaseExpiresAt.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public async Task StaleWorker_CannotPersistResult_AfterJobReclaimedByNewWorker()
    {
        await using var factory = TestWebApplicationFactory.CreateWithWorkerEnabled();
        await TestDataSeeder.SeedAsync(factory.Services);
        ResetFakeProvider(factory.Services);

        var jobId = await SeedCategoryJobAsync(
            factory.Services,
            TranslationJobStatus.Running,
            leaseExpiresAt: DateTime.UtcNow.AddMinutes(-1),
            workerId: StaleWorkerId);

        using var scope = factory.Services.CreateScope();
        var claimService = scope.ServiceProvider.GetRequiredService<ITranslationJobClaimService>();
        var processor = scope.ServiceProvider.GetRequiredService<ITranslationJobProcessor>();
        var dateTimeService = scope.ServiceProvider.GetRequiredService<IDateTimeService>();

        var reclaimed = await claimService.ClaimReadyJobsAsync(1, dateTimeService.UtcNow, CancellationToken.None);
        reclaimed.Should().ContainSingle();
        var newWorkerId = reclaimed[0].WorkerId;

        var staleResult = await processor.ProcessClaimedJobAsync(
            jobId,
            StaleWorkerId,
            CancellationToken.None);
        staleResult.Outcome.Should().Be("StaleClaim");

        var freshResult = await processor.ProcessClaimedJobAsync(
            jobId,
            newWorkerId,
            CancellationToken.None);
        freshResult.Outcome.Should().Be("Succeeded");

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var job = await context.TranslationJobs.AsNoTracking().SingleAsync(item => item.Id == jobId);
        job.Status.Should().Be(TranslationJobStatus.Succeeded);
        job.WorkerId.Should().BeNull();
    }

    [Fact]
    public async Task SucceededJob_ClearsLeaseFields()
    {
        await using var factory = TestWebApplicationFactory.CreateWithWorkerEnabled();
        await TestDataSeeder.SeedAsync(factory.Services);
        ResetFakeProvider(factory.Services);

        var jobId = await SeedCategoryJobAsync(factory.Services, TranslationJobStatus.Queued);

        using var scope = factory.Services.CreateScope();
        var executor = scope.ServiceProvider.GetRequiredService<ITranslationJobWorkerExecutor>();
        await executor.ProcessAvailableJobsAsync(CancellationToken.None);

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var job = await context.TranslationJobs.AsNoTracking().SingleAsync(item => item.Id == jobId);
        job.Status.Should().Be(TranslationJobStatus.Succeeded);
        job.ClaimedAt.Should().BeNull();
        job.LeaseExpiresAt.Should().BeNull();
        job.WorkerId.Should().BeNull();
    }

    [Fact]
    public async Task FailedJob_ClearsLeaseFields()
    {
        await using var factory = TestWebApplicationFactory.CreateWithWorkerEnabled();
        await TestDataSeeder.SeedAsync(factory.Services);
        SetFakeProviderFailure(factory.Services, shouldFail: true);

        var jobId = await SeedCategoryJobAsync(factory.Services, TranslationJobStatus.Queued);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var job = await context.TranslationJobs.SingleAsync(item => item.Id == jobId);
        job.MaxAttempts = 1;
        await context.SaveChangesAsync();

        var executor = scope.ServiceProvider.GetRequiredService<ITranslationJobWorkerExecutor>();
        await executor.ProcessAvailableJobsAsync(CancellationToken.None);

        job = await context.TranslationJobs.AsNoTracking().SingleAsync(item => item.Id == jobId);
        job.Status.Should().Be(TranslationJobStatus.Failed);
        job.ClaimedAt.Should().BeNull();
        job.LeaseExpiresAt.Should().BeNull();
        job.WorkerId.Should().BeNull();
    }

    [Fact]
    public async Task RetryToQueued_ClearsLeaseFields()
    {
        await using var factory = TestWebApplicationFactory.CreateWithWorkerEnabled();
        await TestDataSeeder.SeedAsync(factory.Services);
        SetFakeProviderFailure(factory.Services, shouldFail: true);

        var jobId = await SeedCategoryJobAsync(factory.Services, TranslationJobStatus.Queued);

        using var scope = factory.Services.CreateScope();
        var executor = scope.ServiceProvider.GetRequiredService<ITranslationJobWorkerExecutor>();
        await executor.ProcessAvailableJobsAsync(CancellationToken.None);

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var job = await context.TranslationJobs.AsNoTracking().SingleAsync(item => item.Id == jobId);
        job.Status.Should().Be(TranslationJobStatus.Queued);
        job.AttemptCount.Should().Be(1);
        job.ClaimedAt.Should().BeNull();
        job.LeaseExpiresAt.Should().BeNull();
        job.WorkerId.Should().BeNull();
    }

    [Fact]
    public async Task SkippedJob_ClearsLeaseFields()
    {
        await using var factory = TestWebApplicationFactory.CreateWithWorkerEnabled();
        await TestDataSeeder.SeedAsync(factory.Services);

        var jobId = await SeedCategoryJobAsync(
            factory.Services,
            TranslationJobStatus.Queued,
            sourceVersion: 99);

        using var scope = factory.Services.CreateScope();
        var claimService = scope.ServiceProvider.GetRequiredService<ITranslationJobClaimService>();
        var processor = scope.ServiceProvider.GetRequiredService<ITranslationJobProcessor>();
        var dateTimeService = scope.ServiceProvider.GetRequiredService<IDateTimeService>();

        var claimed = await claimService.ClaimReadyJobsAsync(1, dateTimeService.UtcNow, CancellationToken.None);
        var result = await processor.ProcessClaimedJobAsync(
            claimed[0].JobId,
            claimed[0].WorkerId,
            CancellationToken.None);

        result.Outcome.Should().Be("Skipped");

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var job = await context.TranslationJobs.AsNoTracking().SingleAsync(item => item.Id == jobId);
        job.Status.Should().Be(TranslationJobStatus.Skipped);
        job.ClaimedAt.Should().BeNull();
        job.LeaseExpiresAt.Should().BeNull();
        job.WorkerId.Should().BeNull();
    }

    [Fact]
    public async Task ReleaseClaim_OnCancellation_ClearsLeaseAndReturnsQueued()
    {
        await using var factory = TestWebApplicationFactory.CreateWithWorkerEnabled();
        await TestDataSeeder.SeedAsync(factory.Services);

        var jobId = await SeedCategoryJobAsync(factory.Services, TranslationJobStatus.Queued);

        using var scope = factory.Services.CreateScope();
        var claimService = scope.ServiceProvider.GetRequiredService<ITranslationJobClaimService>();
        var dateTimeService = scope.ServiceProvider.GetRequiredService<IDateTimeService>();

        var claimed = await claimService.ClaimReadyJobsAsync(1, dateTimeService.UtcNow, CancellationToken.None);
        claimed.Should().ContainSingle();

        await claimService.ReleaseClaimAsync(
            claimed[0].JobId,
            claimed[0].WorkerId,
            CancellationToken.None);

        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var job = await context.TranslationJobs.AsNoTracking().SingleAsync(item => item.Id == jobId);
        job.Status.Should().Be(TranslationJobStatus.Queued);
        job.ClaimedAt.Should().BeNull();
        job.LeaseExpiresAt.Should().BeNull();
        job.WorkerId.Should().BeNull();
    }

    [Fact]
    public async Task BatchSize_RemainsRespected_WithLeaseClaims()
    {
        await using var factory = TestWebApplicationFactory.CreateWithWorkerEnabled(batchSize: 2);
        await TestDataSeeder.SeedAsync(factory.Services);

        await SeedCategoryJobAsync(factory.Services, TranslationJobStatus.Queued, targetLocale: "en");
        await SeedCategoryJobAsync(factory.Services, TranslationJobStatus.Queued, targetLocale: "fr");
        await SeedCategoryJobAsync(factory.Services, TranslationJobStatus.Queued, targetLocale: "de");

        using var scope = factory.Services.CreateScope();
        var claimService = scope.ServiceProvider.GetRequiredService<ITranslationJobClaimService>();
        var dateTimeService = scope.ServiceProvider.GetRequiredService<IDateTimeService>();

        var firstBatch = await claimService.ClaimReadyJobsAsync(2, dateTimeService.UtcNow, CancellationToken.None);
        var secondBatch = await claimService.ClaimReadyJobsAsync(2, dateTimeService.UtcNow, CancellationToken.None);

        firstBatch.Should().HaveCount(2);
        secondBatch.Should().HaveCount(1);
    }

    [Fact]
    public async Task WorkerDisabled_DoesNotClaimJobs()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SeedCategoryJobAsync(_factory.Services, TranslationJobStatus.Queued);

        using var scope = _factory.Services.CreateScope();
        var executor = scope.ServiceProvider.GetRequiredService<ITranslationJobWorkerExecutor>();

        var processed = await executor.ProcessAvailableJobsAsync(CancellationToken.None);
        processed.Should().Be(0);
    }

    [Fact]
    public void Migration_IsAdditiveOnly_AndNamedCorrectly()
    {
        var migrationsDirectory = Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "..", "..", "..", "..", "..",
            "src", "RestaurantOrdering.Infrastructure", "Persistence", "Migrations"));

        var migrationFile = Directory.GetFiles(migrationsDirectory, "*AddTranslationJobLeaseRecovery.cs")
            .Single(file => !file.EndsWith(".Designer.cs", StringComparison.Ordinal));

        Path.GetFileName(migrationFile).Should().Contain("AddTranslationJobLeaseRecovery");

        var content = File.ReadAllText(migrationFile);
        content.Should().Contain("AddTranslationJobLeaseRecovery");
        content.Should().Contain("ClaimedAt");
        content.Should().Contain("LeaseExpiresAt");
        content.Should().Contain("WorkerId");
        content.Should().Contain("AddColumn");

        var upSection = content.Split("protected override void Down", StringSplitOptions.None)[0];
        upSection.Should().NotContain("DropColumn");
        upSection.Should().NotContain("DropTable");
    }

    private static async Task<Guid> SeedCategoryJobAsync(
        IServiceProvider services,
        TranslationJobStatus status,
        string targetLocale = "en",
        DateTime? leaseExpiresAt = null,
        string? workerId = null,
        int? sourceVersion = null)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var category = await context.Categories.AsNoTracking()
            .SingleAsync(item => item.Id == TestDataSeeder.CategoryAId);
        var now = DateTime.UtcNow;
        var jobId = Guid.NewGuid();
        var version = sourceVersion ?? category.ContentVersion;

        context.TranslationJobs.Add(new TranslationJob
        {
            Id = jobId,
            RestaurantId = TestDataSeeder.RestaurantAId,
            EntityType = TranslatableEntityType.Category,
            EntityId = TestDataSeeder.CategoryAId,
            TargetLocaleCode = targetLocale,
            SourceLocaleCode = "ar",
            SourceVersion = version,
            Status = status,
            ClaimedAt = status == TranslationJobStatus.Running ? now.AddMinutes(-10) : null,
            LeaseExpiresAt = leaseExpiresAt,
            WorkerId = workerId,
            IdempotencyKey = $"{TranslatableEntityType.Category}:{TestDataSeeder.CategoryAId:N}:{targetLocale}:{version}",
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

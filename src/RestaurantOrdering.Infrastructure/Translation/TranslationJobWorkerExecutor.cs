using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Infrastructure.Translation;

public sealed class TranslationJobWorkerExecutor : ITranslationJobWorkerExecutor
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IOptions<TranslationWorkerOptions> _options;
    private readonly ILogger<TranslationJobWorkerExecutor> _logger;

    public TranslationJobWorkerExecutor(
        IServiceScopeFactory serviceScopeFactory,
        IOptions<TranslationWorkerOptions> options,
        ILogger<TranslationJobWorkerExecutor> logger)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _options = options;
        _logger = logger;
    }

    public async Task<int> ProcessAvailableJobsAsync(CancellationToken cancellationToken)
    {
        if (!_options.Value.Enabled)
        {
            return 0;
        }

        using var scope = _serviceScopeFactory.CreateScope();
        var dateTimeService = scope.ServiceProvider.GetRequiredService<IDateTimeService>();
        var claimService = scope.ServiceProvider.GetRequiredService<ITranslationJobClaimService>();

        var claimedJobs = await claimService.ClaimReadyJobsAsync(
            _options.Value.BatchSize,
            dateTimeService.UtcNow,
            cancellationToken);

        var processedCount = 0;

        foreach (var claimedJob in claimedJobs)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                break;
            }

            processedCount += await ProcessClaimedJobAsync(claimedJob, cancellationToken);
        }

        return processedCount;
    }

    private async Task<int> ProcessClaimedJobAsync(
        TranslationJobClaimResult claimedJob,
        CancellationToken cancellationToken)
    {
        using var scope = _serviceScopeFactory.CreateScope();
        var processor = scope.ServiceProvider.GetRequiredService<ITranslationJobProcessor>();
        var claimService = scope.ServiceProvider.GetRequiredService<ITranslationJobClaimService>();
        var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

        _logger.LogInformation("Translation job {JobId} started.", claimedJob.JobId);

        try
        {
            var result = await processor.ProcessClaimedJobAsync(
                claimedJob.JobId,
                claimedJob.WorkerId,
                cancellationToken);
            await LogOutcomeAsync(context, result, cancellationToken);
            return result.Outcome == "StaleClaim" ? 0 : 1;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            await claimService.ReleaseClaimAsync(
                claimedJob.JobId,
                claimedJob.WorkerId,
                cancellationToken);
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Translation job {JobId} failed unexpectedly.",
                claimedJob.JobId);

            await claimService.ReleaseClaimAsync(
                claimedJob.JobId,
                claimedJob.WorkerId,
                cancellationToken);
            return 0;
        }
    }

    private async Task LogOutcomeAsync(
        IApplicationDbContext context,
        TranslationJobProcessResult result,
        CancellationToken cancellationToken)
    {
        var job = await context.TranslationJobs
            .AsNoTracking()
            .SingleAsync(item => item.Id == result.JobId, cancellationToken);

        switch (result.Outcome)
        {
            case "Succeeded":
                _logger.LogInformation("Translation job {JobId} succeeded.", result.JobId);
                break;
            case "Failed" when job.Status == TranslationJobStatus.Queued:
                _logger.LogWarning(
                    "Translation job {JobId} retry scheduled at {NextAttemptAt}.",
                    result.JobId,
                    job.NextAttemptAt);
                break;
            case "Failed":
                _logger.LogWarning("Translation job {JobId} failed.", result.JobId);
                break;
            case "Skipped":
                _logger.LogInformation("Translation job {JobId} skipped.", result.JobId);
                break;
            case "StaleClaim":
                _logger.LogWarning("Translation job {JobId} claim is no longer valid.", result.JobId);
                break;
            case "NotQueued":
                _logger.LogWarning("Translation job {JobId} was not queued for processing.", result.JobId);
                break;
            default:
                _logger.LogInformation(
                    "Translation job {JobId} completed with outcome {Outcome}.",
                    result.JobId,
                    result.Outcome);
                break;
        }
    }
}

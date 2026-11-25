using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Translation;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Persistence;

namespace RestaurantOrdering.Infrastructure.Translation;

public sealed class TranslationJobClaimService : ITranslationJobClaimService
{
    private readonly ApplicationDbContext _context;
    private readonly ITranslationJobWorkerIdentity _workerIdentity;
    private readonly IOptions<TranslationWorkerOptions> _options;

    public TranslationJobClaimService(
        ApplicationDbContext context,
        ITranslationJobWorkerIdentity workerIdentity,
        IOptions<TranslationWorkerOptions> options)
    {
        _context = context;
        _workerIdentity = workerIdentity;
        _options = options;
    }

    public async Task<IReadOnlyList<TranslationJobClaimResult>> ClaimReadyJobsAsync(
        int batchSize,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        if (batchSize <= 0)
        {
            return [];
        }

        var claimedJobs = new List<TranslationJobClaimResult>(batchSize);
        var workerId = _workerIdentity.WorkerId;
        var leaseExpiresAt = utcNow.AddSeconds(_options.Value.LeaseDurationSeconds);

        for (var index = 0; index < batchSize; index++)
        {
            var claimedJob = await TryClaimNextReadyJobAsync(
                utcNow,
                workerId,
                leaseExpiresAt,
                cancellationToken);

            if (claimedJob is null)
            {
                break;
            }

            claimedJobs.Add(claimedJob);
        }

        return claimedJobs;
    }

    public async Task ReleaseClaimAsync(
        Guid jobId,
        string? expectedWorkerId,
        CancellationToken cancellationToken)
    {
        var job = await _context.TranslationJobs
            .SingleOrDefaultAsync(item => item.Id == jobId, cancellationToken);

        if (job is null || job.Status != TranslationJobStatus.Running)
        {
            return;
        }

        if (expectedWorkerId is not null
            && !string.Equals(job.WorkerId, expectedWorkerId, StringComparison.Ordinal))
        {
            return;
        }

        job.Status = TranslationJobStatus.Queued;
        TranslationJobLease.Clear(job);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task<TranslationJobClaimResult?> TryClaimNextReadyJobAsync(
        DateTime utcNow,
        string workerId,
        DateTime leaseExpiresAt,
        CancellationToken cancellationToken)
    {
        while (true)
        {
            var candidateJobId = await _context.TranslationJobs
                .Where(item =>
                    (item.Status == TranslationJobStatus.Queued
                     && (item.NextAttemptAt == null || item.NextAttemptAt <= utcNow))
                    || (item.Status == TranslationJobStatus.Running
                        && item.LeaseExpiresAt != null
                        && item.LeaseExpiresAt <= utcNow))
                .OrderBy(item => item.CreatedAt)
                .Select(item => item.Id)
                .FirstOrDefaultAsync(cancellationToken);

            if (candidateJobId == Guid.Empty)
            {
                return null;
            }

            if (SupportsExecuteUpdate())
            {
                var queuedRowsUpdated = await _context.TranslationJobs
                    .Where(item =>
                        item.Id == candidateJobId
                        && item.Status == TranslationJobStatus.Queued
                        && (item.NextAttemptAt == null || item.NextAttemptAt <= utcNow))
                    .ExecuteUpdateAsync(
                        setters => setters
                            .SetProperty(item => item.Status, TranslationJobStatus.Running)
                            .SetProperty(item => item.ClaimedAt, utcNow)
                            .SetProperty(item => item.LeaseExpiresAt, leaseExpiresAt)
                            .SetProperty(item => item.WorkerId, workerId),
                        cancellationToken);

                if (queuedRowsUpdated > 0)
                {
                    return new TranslationJobClaimResult(candidateJobId, workerId);
                }

                var reclaimedRowsUpdated = await _context.TranslationJobs
                    .Where(item =>
                        item.Id == candidateJobId
                        && item.Status == TranslationJobStatus.Running
                        && item.LeaseExpiresAt != null
                        && item.LeaseExpiresAt <= utcNow)
                    .ExecuteUpdateAsync(
                        setters => setters
                            .SetProperty(item => item.ClaimedAt, utcNow)
                            .SetProperty(item => item.LeaseExpiresAt, leaseExpiresAt)
                            .SetProperty(item => item.WorkerId, workerId),
                        cancellationToken);

                if (reclaimedRowsUpdated > 0)
                {
                    return new TranslationJobClaimResult(candidateJobId, workerId);
                }

                continue;
            }

            var claimedJob = await TryClaimTrackedJobAsync(
                candidateJobId,
                utcNow,
                workerId,
                leaseExpiresAt,
                cancellationToken);

            if (claimedJob is not null)
            {
                return claimedJob;
            }
        }
    }

    private async Task<TranslationJobClaimResult?> TryClaimTrackedJobAsync(
        Guid candidateJobId,
        DateTime utcNow,
        string workerId,
        DateTime leaseExpiresAt,
        CancellationToken cancellationToken)
    {
        var job = await _context.TranslationJobs
            .FirstOrDefaultAsync(item => item.Id == candidateJobId, cancellationToken);

        if (job is null)
        {
            return null;
        }

        var canClaimQueued = job.Status == TranslationJobStatus.Queued
                             && (job.NextAttemptAt is null || job.NextAttemptAt <= utcNow);
        var canReclaimExpired = job.Status == TranslationJobStatus.Running
                                && job.LeaseExpiresAt.HasValue
                                && job.LeaseExpiresAt.Value <= utcNow;

        if (!canClaimQueued && !canReclaimExpired)
        {
            return null;
        }

        TranslationJobLease.ApplyClaim(job, utcNow, leaseExpiresAt, workerId);

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
            return new TranslationJobClaimResult(job.Id, workerId);
        }
        catch (DbUpdateConcurrencyException)
        {
            _context.Entry(job).State = EntityState.Detached;
            return null;
        }
    }

    private bool SupportsExecuteUpdate() =>
        _context.Database.ProviderName is not null
        && !_context.Database.ProviderName.EndsWith(".InMemory", StringComparison.Ordinal);
}

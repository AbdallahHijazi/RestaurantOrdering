namespace RestaurantOrdering.Application.Common.Interfaces;

public interface ITranslationJobClaimService
{
    Task<IReadOnlyList<TranslationJobClaimResult>> ClaimReadyJobsAsync(
        int batchSize,
        DateTime utcNow,
        CancellationToken cancellationToken);

    Task ReleaseClaimAsync(
        Guid jobId,
        string? expectedWorkerId,
        CancellationToken cancellationToken);
}

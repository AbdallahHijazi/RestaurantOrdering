namespace RestaurantOrdering.Application.Common.Interfaces;

public interface ITranslationJobProcessor
{
    Task<TranslationJobProcessResult?> ProcessNextQueuedJobAsync(CancellationToken cancellationToken);

    Task<TranslationJobProcessResult> ProcessJobAsync(Guid jobId, CancellationToken cancellationToken);
}

public sealed record TranslationJobProcessResult(
    Guid JobId,
    string Outcome,
    string? ErrorMessage = null);

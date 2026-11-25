namespace RestaurantOrdering.Application.Common.Interfaces;

public interface ITranslationJobWorkerExecutor
{
    Task<int> ProcessAvailableJobsAsync(CancellationToken cancellationToken);
}

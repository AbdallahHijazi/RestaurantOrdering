using RestaurantOrdering.Application.Common.Interfaces;

namespace RestaurantOrdering.Infrastructure.Translation;

public sealed class TranslationJobWorkerIdentity : ITranslationJobWorkerIdentity
{
    public TranslationJobWorkerIdentity()
    {
        WorkerId = $"{Environment.MachineName}:{Guid.NewGuid():N}";
    }

    public string WorkerId { get; }
}

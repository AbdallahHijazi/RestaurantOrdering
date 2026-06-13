namespace RestaurantOrdering.Domain.Enums;

public enum TranslationJobStatus : byte
{
    Queued = 1,
    Running = 2,
    Succeeded = 3,
    Failed = 4,
    Skipped = 5
}

namespace RestaurantOrdering.Infrastructure.Translation;

public sealed class TranslationWorkerOptions
{
    public const string SectionName = "TranslationWorker";

    public bool Enabled { get; set; }

    public int PollingIntervalSeconds { get; set; } = 10;

    public int BatchSize { get; set; } = 10;

    public int LeaseDurationSeconds { get; set; } = 120;
}

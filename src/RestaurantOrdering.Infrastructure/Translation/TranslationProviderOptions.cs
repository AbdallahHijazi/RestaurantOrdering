namespace RestaurantOrdering.Infrastructure.Translation;

public sealed class TranslationProviderOptions
{
    public const string SectionName = "TranslationProvider";

    public string Provider { get; set; } = TranslationProviderNames.NoOp;
}

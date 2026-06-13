namespace RestaurantOrdering.Infrastructure.Translation;

public sealed class AzureTranslatorOptions
{
    public const string SectionName = "TranslationProvider:AzureTranslator";

    public string Endpoint { get; set; } = string.Empty;

    public string Region { get; set; } = string.Empty;

    public int TimeoutSeconds { get; set; } = 30;

    public string SubscriptionKey { get; set; } = string.Empty;
}

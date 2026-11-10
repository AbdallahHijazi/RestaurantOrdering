using Microsoft.Extensions.Options;

namespace RestaurantOrdering.Infrastructure.Translation;

internal sealed class TranslationProviderOptionsValidator : IValidateOptions<TranslationProviderOptions>
{
    public ValidateOptionsResult Validate(string? name, TranslationProviderOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.Provider)
            || string.Equals(options.Provider, TranslationProviderNames.NoOp, StringComparison.OrdinalIgnoreCase)
            || string.Equals(options.Provider, TranslationProviderNames.AzureTranslator, StringComparison.OrdinalIgnoreCase))
        {
            return ValidateOptionsResult.Success;
        }

        return ValidateOptionsResult.Fail(
            $"TranslationProvider:Provider '{options.Provider}' is not supported. Use '{TranslationProviderNames.NoOp}' or '{TranslationProviderNames.AzureTranslator}'.");
    }
}

internal sealed class AzureTranslatorOptionsValidator : IValidateOptions<AzureTranslatorOptions>
{
    private readonly IOptions<TranslationProviderOptions> _providerOptions;
    private readonly IOptions<TranslationWorkerOptions> _workerOptions;

    public AzureTranslatorOptionsValidator(
        IOptions<TranslationProviderOptions> providerOptions,
        IOptions<TranslationWorkerOptions> workerOptions)
    {
        _providerOptions = providerOptions;
        _workerOptions = workerOptions;
    }

    public ValidateOptionsResult Validate(string? name, AzureTranslatorOptions options)
    {
        if (!IsAzureTranslatorEnabled())
        {
            return ValidateOptionsResult.Success;
        }

        if (string.IsNullOrWhiteSpace(options.Endpoint))
        {
            return ValidateOptionsResult.Fail(
                "TranslationProvider:AzureTranslator:Endpoint is required when Azure Translator is enabled.");
        }

        if (string.IsNullOrWhiteSpace(options.SubscriptionKey))
        {
            return ValidateOptionsResult.Fail(
                "TranslationProvider:AzureTranslator:SubscriptionKey is required when Azure Translator is enabled.");
        }

        if (options.TimeoutSeconds <= 0)
        {
            return ValidateOptionsResult.Fail(
                "TranslationProvider:AzureTranslator:TimeoutSeconds must be greater than zero when Azure Translator is enabled.");
        }

        if (options.TimeoutSeconds >= _workerOptions.Value.LeaseDurationSeconds)
        {
            return ValidateOptionsResult.Fail(
                "TranslationProvider:AzureTranslator:TimeoutSeconds must be less than TranslationWorker:LeaseDurationSeconds when Azure Translator is enabled.");
        }

        return ValidateOptionsResult.Success;
    }

    private bool IsAzureTranslatorEnabled() =>
        string.Equals(
            _providerOptions.Value.Provider,
            TranslationProviderNames.AzureTranslator,
            StringComparison.OrdinalIgnoreCase);
}

using RestaurantOrdering.Application.Common.Interfaces;

namespace RestaurantOrdering.Application.Common.Translation;

public sealed class NoOpTranslationProvider : ITranslationProvider
{
    public Task<TranslationProviderResult> TranslateAsync(
        TranslationProviderRequest request,
        CancellationToken cancellationToken) =>
        Task.FromResult(new TranslationProviderResult(
            IsSuccess: false,
            TranslatedFields: null,
            FailedFieldKeys: ["name", "description", "address"],
            ErrorCode: "PROVIDER_NOT_CONFIGURED",
            ErrorMessage: "No external translation provider is configured."));
}

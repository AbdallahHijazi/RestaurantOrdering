using RestaurantOrdering.Application.Common.Translation;

namespace RestaurantOrdering.Application.Common.Interfaces;

public interface ITranslationProvider
{
    Task<TranslationProviderResult> TranslateAsync(
        TranslationProviderRequest request,
        CancellationToken cancellationToken);
}

using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Translation;

namespace RestaurantOrdering.IntegrationTests.Infrastructure;

public sealed class FakeTranslationProvider : ITranslationProvider
{
    public bool ShouldFail { get; set; }

    public string? FailureErrorCode { get; set; }

    public string? FailureMessage { get; set; }

    public int TranslateCallCount { get; private set; }

    public void Reset()
    {
        ShouldFail = false;
        FailureErrorCode = null;
        FailureMessage = null;
        TranslateCallCount = 0;
    }

    public Task<TranslationProviderResult> TranslateAsync(
        TranslationProviderRequest request,
        CancellationToken cancellationToken)
    {
        TranslateCallCount++;

        if (ShouldFail)
        {
            return Task.FromResult(new TranslationProviderResult(
                IsSuccess: false,
                TranslatedFields: null,
                FailedFieldKeys: ["name"],
                FailureErrorCode ?? "FAKE_PROVIDER_FAILURE",
                FailureMessage ?? "Fake provider failure."));
        }

        var prefix = $"[{request.TargetLocale}]";
        var translated = new TranslationFields(
            $"{prefix} {request.Fields.Name}",
            string.IsNullOrWhiteSpace(request.Fields.Description)
                ? null
                : $"{prefix} {request.Fields.Description}",
            string.IsNullOrWhiteSpace(request.Fields.Address)
                ? null
                : $"{prefix} {request.Fields.Address}");

        return Task.FromResult(new TranslationProviderResult(
            IsSuccess: true,
            TranslatedFields: translated,
            FailedFieldKeys: [],
            ErrorCode: null,
            ErrorMessage: null));
    }
}

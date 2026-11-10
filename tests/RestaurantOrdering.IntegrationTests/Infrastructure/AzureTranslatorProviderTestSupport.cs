using System.Net;
using RestaurantOrdering.Application.Common.Translation;
using RestaurantOrdering.Infrastructure.Translation;

namespace RestaurantOrdering.IntegrationTests.Infrastructure;

internal sealed class StubHttpMessageHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _handler;

    public HttpRequestMessage? LastRequest { get; private set; }

    public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
        : this((request, _) => Task.FromResult(handler(request)))
    {
    }

    public StubHttpMessageHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> handler)
    {
        _handler = handler;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        LastRequest = request;
        return await _handler(request, cancellationToken);
    }
}

internal sealed class SingleHttpClientFactory : IHttpClientFactory
{
    private readonly HttpClient _httpClient;

    public SingleHttpClientFactory(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public HttpClient CreateClient(string name) => _httpClient;
}

internal static class AzureTranslatorTestResponses
{
    public static string Success(params string[] translatedTexts)
    {
        var items = translatedTexts
            .Select(text => $$"""{"translations":[{"text":{{JsonEscape(text)}},"to":"en"}]}""")
            .ToArray();

        return $"[{string.Join(',', items)}]";
    }

    private static string JsonEscape(string value) =>
        $"\"{value.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("\"", "\\\"", StringComparison.Ordinal)}\"";
}

internal static class AzureTranslatorProviderTestFactory
{
    public const string TestSubscriptionKey = "test-subscription-key-not-a-secret";

    public static AzureTranslatorProvider CreateProvider(
        HttpMessageHandler handler,
        string? region = null,
        int timeoutSeconds = 30)
    {
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://fake-translator.test/"),
            Timeout = TimeSpan.FromSeconds(timeoutSeconds)
        };

        return new AzureTranslatorProvider(
            new SingleHttpClientFactory(httpClient),
            Microsoft.Extensions.Options.Options.Create(new AzureTranslatorOptions
            {
                Endpoint = "https://fake-translator.test",
                Region = region ?? string.Empty,
                TimeoutSeconds = timeoutSeconds,
                SubscriptionKey = TestSubscriptionKey
            }),
            Microsoft.Extensions.Logging.Abstractions.NullLogger<AzureTranslatorProvider>.Instance);
    }

    public static TranslationProviderRequest CreateRequest(
        string? description = "Arabic description",
        string? address = "Arabic address") =>
        new(
            SourceLocale: "ar",
            TargetLocale: "en",
            Fields: new TranslationFields(
                "Arabic name",
                description,
                address),
            IdempotencyKey: "test-idempotency-key");
}

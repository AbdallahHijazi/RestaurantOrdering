using System.Diagnostics;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Translation;

namespace RestaurantOrdering.Infrastructure.Translation;

public sealed class AzureTranslatorProvider : ITranslationProvider
{
    public const string HttpClientName = "AzureTranslator";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = null,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly AzureTranslatorOptions _options;
    private readonly ILogger<AzureTranslatorProvider> _logger;

    public AzureTranslatorProvider(
        IHttpClientFactory httpClientFactory,
        IOptions<AzureTranslatorOptions> options,
        ILogger<AzureTranslatorProvider> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<TranslationProviderResult> TranslateAsync(
        TranslationProviderRequest request,
        CancellationToken cancellationToken)
    {
        var fieldKeys = BuildFieldKeys(request.Fields);
        var fieldCount = fieldKeys.Count;

        _logger.LogInformation(
            "Azure translator provider request started for target locale {TargetLocale} with {FieldCount} fields.",
            request.TargetLocale,
            fieldCount);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            using var httpRequest = BuildHttpRequest(request, fieldKeys);
            var httpClient = _httpClientFactory.CreateClient(HttpClientName);

            using var response = await httpClient.SendAsync(httpRequest, cancellationToken);
            stopwatch.Stop();

            if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
            {
                _logger.LogWarning(
                    "Azure translator provider request failed with status {StatusCode} after {DurationMs}ms.",
                    (int)response.StatusCode,
                    stopwatch.ElapsedMilliseconds);

                return Failure(
                    ["name", "description", "address"],
                    AzureTranslatorErrorCodes.Unauthorized,
                    "Translation provider authentication failed.");
            }

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                _logger.LogWarning(
                    "Azure translator provider throttled with status {StatusCode} after {DurationMs}ms.",
                    (int)response.StatusCode,
                    stopwatch.ElapsedMilliseconds);

                return Failure(
                    ["name", "description", "address"],
                    AzureTranslatorErrorCodes.Throttled,
                    "Translation provider rate limit exceeded.");
            }

            if ((int)response.StatusCode >= 500)
            {
                _logger.LogWarning(
                    "Azure translator provider request failed with status {StatusCode} after {DurationMs}ms.",
                    (int)response.StatusCode,
                    stopwatch.ElapsedMilliseconds);

                return Failure(
                    ["name", "description", "address"],
                    AzureTranslatorErrorCodes.ServerError,
                    "Translation provider returned a server error.");
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Azure translator provider request failed with status {StatusCode} after {DurationMs}ms.",
                    (int)response.StatusCode,
                    stopwatch.ElapsedMilliseconds);

                return Failure(
                    ["name", "description", "address"],
                    AzureTranslatorErrorCodes.HttpError,
                    "Translation provider request failed.");
            }

            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            return ParseSuccessResponse(request, fieldKeys, responseBody, stopwatch.ElapsedMilliseconds);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            stopwatch.Stop();
            _logger.LogWarning(
                "Azure translator provider request was cancelled after {DurationMs}ms.",
                stopwatch.ElapsedMilliseconds);

            return Failure(
                fieldKeys,
                AzureTranslatorErrorCodes.Cancelled,
                "Translation provider request was cancelled.");
        }
        catch (TaskCanceledException)
        {
            stopwatch.Stop();
            _logger.LogWarning(
                "Azure translator provider timeout after {DurationMs}ms.",
                stopwatch.ElapsedMilliseconds);

            return Failure(
                fieldKeys,
                AzureTranslatorErrorCodes.Timeout,
                "Translation provider request timed out.");
        }
        catch (JsonException)
        {
            stopwatch.Stop();
            _logger.LogWarning(
                "Azure translator provider returned malformed JSON after {DurationMs}ms.",
                stopwatch.ElapsedMilliseconds);

            return Failure(
                fieldKeys,
                AzureTranslatorErrorCodes.MalformedResponse,
                "Translation provider returned an invalid response.");
        }
    }

    private HttpRequestMessage BuildHttpRequest(
        TranslationProviderRequest request,
        IReadOnlyList<string> fieldKeys)
    {
        var query = $"translate?api-version=3.0&from={Uri.EscapeDataString(request.SourceLocale)}&to={Uri.EscapeDataString(request.TargetLocale)}";
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, query);

        httpRequest.Headers.TryAddWithoutValidation("Ocp-Apim-Subscription-Key", _options.SubscriptionKey);

        if (!string.IsNullOrWhiteSpace(_options.Region))
        {
            httpRequest.Headers.TryAddWithoutValidation("Ocp-Apim-Subscription-Region", _options.Region);
        }

        var bodyItems = new List<AzureTranslateRequestItem>(fieldKeys.Count);

        foreach (var fieldKey in fieldKeys)
        {
            bodyItems.Add(new AzureTranslateRequestItem(GetFieldValue(request.Fields, fieldKey)));
        }

        httpRequest.Content = new StringContent(
            JsonSerializer.Serialize(bodyItems, JsonOptions),
            Encoding.UTF8,
            "application/json");

        return httpRequest;
    }

    private TranslationProviderResult ParseSuccessResponse(
        TranslationProviderRequest request,
        IReadOnlyList<string> fieldKeys,
        string responseBody,
        long durationMs)
    {
        var responseItems = JsonSerializer.Deserialize<List<AzureTranslateResponseItem>>(responseBody, JsonOptions);

        if (responseItems is null)
        {
            _logger.LogWarning(
                "Azure translator provider returned malformed JSON after {DurationMs}ms.",
                durationMs);

            return Failure(
                fieldKeys,
                AzureTranslatorErrorCodes.MalformedResponse,
                "Translation provider returned an invalid response.");
        }

        if (responseItems.Count != fieldKeys.Count)
        {
            _logger.LogWarning(
                "Azure translator provider item count mismatch after {DurationMs}ms. Expected {ExpectedCount}, received {ActualCount}.",
                durationMs,
                fieldKeys.Count,
                responseItems.Count);

            return Failure(
                fieldKeys,
                AzureTranslatorErrorCodes.ItemCountMismatch,
                "Translation provider returned an unexpected number of translations.");
        }

        var translatedValues = new Dictionary<string, string>(fieldKeys.Count, StringComparer.Ordinal);
        var failedFieldKeys = new List<string>();

        for (var index = 0; index < fieldKeys.Count; index++)
        {
            var translatedText = responseItems[index].Translations?.FirstOrDefault()?.Text;

            if (string.IsNullOrWhiteSpace(translatedText))
            {
                failedFieldKeys.Add(fieldKeys[index]);
                continue;
            }

            translatedValues[fieldKeys[index]] = translatedText.Trim();
        }

        if (failedFieldKeys.Count > 0)
        {
            _logger.LogWarning(
                "Azure translator provider request failed after {DurationMs}ms with {FailedFieldCount} empty translations.",
                durationMs,
                failedFieldKeys.Count);

            return new TranslationProviderResult(
                IsSuccess: false,
                TranslatedFields: BuildTranslatedFields(request.Fields, translatedValues),
                FailedFieldKeys: failedFieldKeys,
                ErrorCode: AzureTranslatorErrorCodes.PartialFailure,
                ErrorMessage: "Translation provider returned empty translations for one or more fields.");
        }

        _logger.LogInformation(
            "Azure translator provider request succeeded for target locale {TargetLocale} with {FieldCount} fields in {DurationMs}ms.",
            request.TargetLocale,
            fieldKeys.Count,
            durationMs);

        return new TranslationProviderResult(
            IsSuccess: true,
            TranslatedFields: BuildTranslatedFields(request.Fields, translatedValues),
            FailedFieldKeys: [],
            ErrorCode: null,
            ErrorMessage: null);
    }

    private static List<string> BuildFieldKeys(TranslationFields fields)
    {
        var fieldKeys = new List<string> { "name" };

        if (!string.IsNullOrWhiteSpace(fields.Description))
        {
            fieldKeys.Add("description");
        }

        if (!string.IsNullOrWhiteSpace(fields.Address))
        {
            fieldKeys.Add("address");
        }

        return fieldKeys;
    }

    private static string GetFieldValue(TranslationFields fields, string fieldKey) =>
        fieldKey switch
        {
            "name" => fields.Name,
            "description" => fields.Description ?? string.Empty,
            "address" => fields.Address ?? string.Empty,
            _ => throw new InvalidOperationException($"Unsupported translation field '{fieldKey}'.")
        };

    private static TranslationFields BuildTranslatedFields(
        TranslationFields sourceFields,
        IReadOnlyDictionary<string, string> translatedValues) =>
        new(
            translatedValues.GetValueOrDefault("name") ?? string.Empty,
            translatedValues.TryGetValue("description", out var description) ? description : null,
            translatedValues.TryGetValue("address", out var address) ? address : null);

    private static TranslationProviderResult Failure(
        IReadOnlyList<string> failedFieldKeys,
        string errorCode,
        string errorMessage) =>
        new(
            IsSuccess: false,
            TranslatedFields: null,
            FailedFieldKeys: failedFieldKeys,
            ErrorCode: errorCode,
            ErrorMessage: errorMessage);

    private sealed class AzureTranslateRequestItem
    {
        public AzureTranslateRequestItem(string text) => Text = text;

        public string Text { get; }
    }

    private sealed class AzureTranslateResponseItem
    {
        [JsonPropertyName("translations")]
        public List<AzureTranslateTextItem>? Translations { get; set; }
    }

    private sealed class AzureTranslateTextItem
    {
        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }
}

internal static class AzureTranslatorErrorCodes
{
    public const string Unauthorized = "PROVIDER_UNAUTHORIZED";

    public const string Throttled = "PROVIDER_THROTTLED";

    public const string ServerError = "PROVIDER_SERVER_ERROR";

    public const string HttpError = "PROVIDER_HTTP_ERROR";

    public const string Timeout = "PROVIDER_TIMEOUT";

    public const string Cancelled = "PROVIDER_CANCELLED";

    public const string MalformedResponse = "PROVIDER_MALFORMED_RESPONSE";

    public const string ItemCountMismatch = "PROVIDER_ITEM_COUNT_MISMATCH";

    public const string PartialFailure = "PROVIDER_PARTIAL_FAILURE";
}

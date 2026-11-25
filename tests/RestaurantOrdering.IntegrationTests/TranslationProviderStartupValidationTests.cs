using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Translation;
using RestaurantOrdering.Infrastructure.Translation;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class TranslationProviderStartupValidationTests
{
    [Fact]
    public void DefaultProvider_ResolvesNoOpTranslationProvider()
    {
        using var factory = TestWebApplicationFactory.CreateForProviderSelection(useFakeTranslationProvider: false);

        using var scope = factory.Services.CreateScope();
        var provider = scope.ServiceProvider.GetRequiredService<ITranslationProvider>();

        provider.Should().BeOfType<NoOpTranslationProvider>();
    }

    [Fact]
    public void AzureTranslatorProvider_IsSelectedWhenConfigured()
    {
        using var factory = TestWebApplicationFactory.CreateWithAzureTranslator(
            new StubHttpMessageHandler(_ => new HttpResponseMessage(System.Net.HttpStatusCode.OK)));

        using var scope = factory.Services.CreateScope();
        var provider = scope.ServiceProvider.GetRequiredService<ITranslationProvider>();

        provider.Should().BeOfType<AzureTranslatorProvider>();
    }

    [Fact]
    public void Startup_WithAzureEnabledAndMissingSubscriptionKey_FailsFast()
    {
        using var factory = TestWebApplicationFactory.CreateForProviderSelection(
            useFakeTranslationProvider: false,
            configure: config =>
            {
                config["TranslationProvider:Provider"] = TranslationProviderNames.AzureTranslator;
                config["TranslationProvider:AzureTranslator:Endpoint"] = "https://fake-translator.test";
                config["TranslationProvider:AzureTranslator:SubscriptionKey"] = string.Empty;
                config["TranslationProvider:AzureTranslator:TimeoutSeconds"] = "30";
            });

        Action act = () => factory.CreateClient();

        act.Should()
            .Throw<OptionsValidationException>()
            .WithMessage("*SubscriptionKey*");
    }

    [Fact]
    public void Startup_WithAzureEnabledAndMissingEndpoint_FailsFast()
    {
        using var factory = TestWebApplicationFactory.CreateForProviderSelection(
            useFakeTranslationProvider: false,
            configure: config =>
            {
                config["TranslationProvider:Provider"] = TranslationProviderNames.AzureTranslator;
                config["TranslationProvider:AzureTranslator:Endpoint"] = string.Empty;
                config["TranslationProvider:AzureTranslator:SubscriptionKey"] = "test-subscription-key-not-a-secret";
                config["TranslationProvider:AzureTranslator:TimeoutSeconds"] = "30";
            });

        Action act = () => factory.CreateClient();

        act.Should()
            .Throw<OptionsValidationException>()
            .WithMessage("*Endpoint*");
    }

    [Fact]
    public void Startup_WithAzureEnabledAndNonPositiveTimeout_FailsFast()
    {
        using var factory = TestWebApplicationFactory.CreateForProviderSelection(
            useFakeTranslationProvider: false,
            configure: config =>
            {
                config["TranslationProvider:Provider"] = TranslationProviderNames.AzureTranslator;
                config["TranslationProvider:AzureTranslator:Endpoint"] = "https://fake-translator.test";
                config["TranslationProvider:AzureTranslator:SubscriptionKey"] = "test-subscription-key-not-a-secret";
                config["TranslationProvider:AzureTranslator:TimeoutSeconds"] = "0";
            });

        Action act = () => factory.CreateClient();

        act.Should()
            .Throw<OptionsValidationException>()
            .WithMessage("*TimeoutSeconds*");
    }

    [Fact]
    public void Startup_WithAzureEnabledAndTimeoutGreaterThanOrEqualLease_FailsFast()
    {
        using var factory = TestWebApplicationFactory.CreateForProviderSelection(
            useFakeTranslationProvider: false,
            configure: config =>
            {
                config["TranslationProvider:Provider"] = TranslationProviderNames.AzureTranslator;
                config["TranslationProvider:AzureTranslator:Endpoint"] = "https://fake-translator.test";
                config["TranslationProvider:AzureTranslator:SubscriptionKey"] = "test-subscription-key-not-a-secret";
                config["TranslationProvider:AzureTranslator:TimeoutSeconds"] = "120";
                config["TranslationWorker:LeaseDurationSeconds"] = "120";
            });

        Action act = () => factory.CreateClient();

        act.Should()
            .Throw<OptionsValidationException>()
            .WithMessage("*TimeoutSeconds must be less than TranslationWorker:LeaseDurationSeconds*");
    }
}

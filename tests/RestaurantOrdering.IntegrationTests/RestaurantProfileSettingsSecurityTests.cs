using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class RestaurantProfileSettingsSecurityTests : IClassFixture<TestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public RestaurantProfileSettingsSecurityTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Settings_Anonymous_Returns401()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var getResponse = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/settings");
        getResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var putResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/settings",
            CreateSettingsPayload());
        putResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Settings_OwnerForOwnRestaurant_CanGetAndUpdate()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var getResponse = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/settings");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var putResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/settings",
            CreateSettingsPayload(taxRate: 10m, deliveryFee: 5m, minimumOrderAmount: 25m));
        putResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var payload = await putResponse.Content.ReadFromJsonAsync<SettingsResponse>(JsonOptions);
        payload!.TaxRate.Should().Be(10m);
        payload.DeliveryFee.Should().Be(5m);
        payload.MinimumOrderAmount.Should().Be(25m);
    }

    [Fact]
    public async Task Settings_Manager_Returns403BecauseControllerRequiresOwnerRole()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        (await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/settings")).StatusCode
            .Should().Be(HttpStatusCode.Forbidden);

        (await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/settings",
            CreateSettingsPayload())).StatusCode
            .Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Settings_KitchenManager_Returns403BecauseControllerRequiresOwnerRole()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        (await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/settings")).StatusCode
            .Should().Be(HttpStatusCode.Forbidden);

        (await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/settings",
            CreateSettingsPayload())).StatusCode
            .Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Settings_OwnerForAnotherRestaurant_Returns404BecauseOwnershipBehaviorHidesResource()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        (await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}/settings")).StatusCode
            .Should().Be(HttpStatusCode.NotFound);

        (await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}/settings",
            CreateSettingsPayload())).StatusCode
            .Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task RestaurantProfile_ManagerCannotUpdate_Returns403()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        (await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}")).StatusCode
            .Should().Be(HttpStatusCode.Forbidden);

        (await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}",
            CreateRestaurantPayload())).StatusCode
            .Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task RestaurantProfile_KitchenManagerCannotUpdate_Returns403()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        (await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}")).StatusCode
            .Should().Be(HttpStatusCode.Forbidden);

        (await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}",
            CreateRestaurantPayload())).StatusCode
            .Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task RestaurantProfile_OwnerForAnotherRestaurant_Returns404()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        (await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}")).StatusCode
            .Should().Be(HttpStatusCode.NotFound);

        (await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}",
            CreateRestaurantPayload(slug: "restaurant-b"))).StatusCode
            .Should().Be(HttpStatusCode.NotFound);
    }

    private static object CreateSettingsPayload(
        decimal taxRate = 15m,
        decimal deliveryFee = 0m,
        decimal minimumOrderAmount = 0m) =>
        new
        {
            CurrencyCode = "SAR",
            TimeZone = "Asia/Riyadh",
            TaxRate = taxRate,
            DeliveryFee = deliveryFee,
            MinimumOrderAmount = minimumOrderAmount,
            IsDeliveryEnabled = true,
            IsPickupEnabled = true,
            WorkingHoursJson = (string?)null
        };

    private static object CreateRestaurantPayload(string slug = "restaurant-a") =>
        new
        {
            Slug = slug,
            NameAr = "مطعم",
            NameEn = "Restaurant",
            DescriptionAr = (string?)null,
            DescriptionEn = (string?)null,
            PhoneNumber = "+966500000000",
            WhatsAppNumber = (string?)null,
            AddressAr = (string?)null,
            AddressEn = (string?)null,
            Latitude = (decimal?)null,
            Longitude = (decimal?)null
        };

    private static async Task AuthenticateAsync(HttpClient client, string email, string password)
    {
        var loginResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { Email = email, Password = password });
        loginResponse.EnsureSuccessStatusCode();

        var payload = await loginResponse.Content.ReadFromJsonAsync<LoginResponseModel>(JsonOptions);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", payload!.AccessToken);
    }

    private static HttpClient CreateHttpsClient(WebApplicationFactory<Program> factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

    private HttpClient CreateHttpsClient() => CreateHttpsClient(_factory);

    private sealed class LoginResponseModel
    {
        public string AccessToken { get; init; } = string.Empty;
    }

    private sealed class SettingsResponse
    {
        public decimal TaxRate { get; init; }
        public decimal DeliveryFee { get; init; }
        public decimal MinimumOrderAmount { get; init; }
    }
}

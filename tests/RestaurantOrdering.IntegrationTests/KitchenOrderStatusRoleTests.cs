using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class KitchenOrderStatusRoleTests : IClassFixture<TestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public KitchenOrderStatusRoleTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task KitchenManager_NewToPreparing_Returns200()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        var response = await PatchStatusAsync(
            client,
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.OrderAId,
            OrderStatus.Preparing);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task KitchenManager_PreparingToReady_Returns200()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        var response = await PatchStatusAsync(
            client,
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.OrderAPreparingId,
            OrderStatus.Ready);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task KitchenManager_NewToCancelled_Returns403()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        var response = await PatchStatusAsync(
            client,
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.OrderAId,
            OrderStatus.Cancelled);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task KitchenManager_PreparingToCancelled_Returns403()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        var response = await PatchStatusAsync(
            client,
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.OrderAPreparingId,
            OrderStatus.Cancelled);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task KitchenManager_ReadyToCancelled_Returns403()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        var response = await PatchStatusAsync(
            client,
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.OrderAReadyId,
            OrderStatus.Cancelled);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task KitchenManager_ReadyToCompleted_Returns403()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        var response = await PatchStatusAsync(
            client,
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.OrderAReadyId,
            OrderStatus.Completed);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task RestaurantManager_NewToCancelled_Returns200()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        var response = await PatchStatusAsync(
            client,
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.OrderAId,
            OrderStatus.Cancelled);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task RestaurantManager_ReadyToCompleted_Returns200()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        var response = await PatchStatusAsync(
            client,
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.OrderAReadyId,
            OrderStatus.Completed);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task RestaurantOwner_NewToCancelled_Returns200()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await PatchStatusAsync(
            client,
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.OrderAId,
            OrderStatus.Cancelled);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task RestaurantOwner_ReadyToCompleted_Returns200()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await PatchStatusAsync(
            client,
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.OrderAReadyId,
            OrderStatus.Completed);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private static Task<HttpResponseMessage> PatchStatusAsync(
        HttpClient client,
        Guid restaurantId,
        Guid orderId,
        OrderStatus newStatus) =>
        client.PatchAsJsonAsync(
            $"/api/v1/admin/restaurants/{restaurantId}/orders/{orderId}/status",
            new { NewStatus = newStatus });

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
}

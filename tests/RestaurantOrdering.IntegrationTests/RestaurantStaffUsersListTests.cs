using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class RestaurantStaffUsersListTests : IClassFixture<TestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public RestaurantStaffUsersListTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetUsers_AsOwner_ReturnsRestaurantStaff()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        const string managerEmail = "list.manager@test.local";
        const string kitchenEmail = "list.kitchen@test.local";

        var createManager = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
            CreateUserRequest(managerEmail, ApplicationRoles.RestaurantManager));
        createManager.StatusCode.Should().Be(HttpStatusCode.Created);

        var createKitchen = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
            CreateUserRequest(kitchenEmail, ApplicationRoles.KitchenManager));
        createKitchen.StatusCode.Should().Be(HttpStatusCode.Created);

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<List<RestaurantUserResponse>>(JsonOptions);
        payload.Should().NotBeNull();

        payload!.Should().Contain(user =>
            user.Email == managerEmail &&
            user.Role == ApplicationRoles.RestaurantManager &&
            user.RestaurantId == TestDataSeeder.RestaurantAId);
        payload.Should().Contain(user =>
            user.Email == kitchenEmail &&
            user.Role == ApplicationRoles.KitchenManager &&
            user.RestaurantId == TestDataSeeder.RestaurantAId);
        payload.Should().Contain(user => user.Email == TestDataSeeder.ManagerAEmail);
        payload.Should().Contain(user => user.Email == TestDataSeeder.KitchenAEmail);
    }

    [Fact]
    public async Task GetUsers_DoesNotReturnRestaurantOwner()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<List<RestaurantUserResponse>>(JsonOptions);
        payload.Should().NotBeNull();
        payload!.Should().NotContain(user => user.Id == TestDataSeeder.OwnerAUserId);
        payload.Should().NotContain(user => user.Role == ApplicationRoles.RestaurantOwner);
    }

    [Fact]
    public async Task GetUsers_AsRestaurantManager_Returns403()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetUsers_AsKitchenManager_Returns403()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetUsers_Anonymous_Returns401()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetUsers_ForAnotherRestaurant_Returns404()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}/users");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetUsers_EmptyRestaurant_Returns200WithEmptyArray()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerBEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}/users");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<List<RestaurantUserResponse>>(JsonOptions);
        payload.Should().NotBeNull();
        payload!.Should().BeEmpty();
    }

    [Fact]
    public async Task GetUsers_ResponseDoesNotExposeSensitiveIdentityFields()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        json.Should().NotContain("Password", because: "sensitive identity fields must not be returned");
        json.Should().NotContain("PasswordHash", because: "sensitive identity fields must not be returned");
        json.Should().NotContain("SecurityStamp", because: "sensitive identity fields must not be returned");
        json.Should().NotContain("ConcurrencyStamp", because: "sensitive identity fields must not be returned");
        json.Should().NotContain("accessToken", because: "tokens must not be returned");
    }

    private static object CreateUserRequest(string email, string role) =>
        new
        {
            Email = email,
            Password = TestDataSeeder.CorrectPassword,
            FullName = "Staff User",
            PhoneNumber = (string?)null,
            Role = role
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

    private sealed class RestaurantUserResponse
    {
        public Guid Id { get; init; }
        public string Email { get; init; } = string.Empty;
        public string? FullName { get; init; }
        public string? PhoneNumber { get; init; }
        public Guid RestaurantId { get; init; }
        public string Role { get; init; } = string.Empty;
        public bool IsActive { get; init; }
    }
}

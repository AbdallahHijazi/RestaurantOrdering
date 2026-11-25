using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class RestaurantUserManagementRateLimitTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    [Fact]
    public async Task CreateUser_ExceedingRateLimit_Returns429()
    {
        using var isolatedFactory = TestWebApplicationFactory.CreateWithStrictRateLimits();
        await TestDataSeeder.SeedAsync(isolatedFactory.Services);
        using var client = CreateHttpsClient(isolatedFactory);
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        for (var attempt = 1; attempt <= 10; attempt++)
        {
            var response = await client.PostAsJsonAsync(
                $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
                CreateUserRequest($"rate-limit.a.{attempt}@test.local", TestDataSeeder.CorrectPassword, ApplicationRoles.RestaurantManager));

            response.StatusCode.Should().Be(HttpStatusCode.Created, $"attempt {attempt} should succeed");
        }

        var limitedResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
            CreateUserRequest("rate-limit.a.exceeded@test.local", TestDataSeeder.CorrectPassword, ApplicationRoles.RestaurantManager));

        limitedResponse.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        var problem = await limitedResponse.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        problem.Should().NotBeNull();
        problem!.Status.Should().Be(StatusCodes.Status429TooManyRequests);
        problem.Title.Should().Be("Too many requests.");
    }

    [Fact]
    public async Task CreateUser_RateLimitPartitionIsPerOwner_NotSharedByIp()
    {
        using var isolatedFactory = TestWebApplicationFactory.CreateWithStrictRateLimits();
        await TestDataSeeder.SeedAsync(isolatedFactory.Services);
        using var client = CreateHttpsClient(isolatedFactory);

        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        for (var attempt = 1; attempt <= 10; attempt++)
        {
            var response = await client.PostAsJsonAsync(
                $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
                CreateUserRequest($"partition.a.{attempt}@test.local", TestDataSeeder.CorrectPassword, ApplicationRoles.KitchenManager));

            response.StatusCode.Should().Be(HttpStatusCode.Created, $"owner A attempt {attempt} should succeed");
        }

        var ownerALimitedResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
            CreateUserRequest("partition.a.exceeded@test.local", TestDataSeeder.CorrectPassword, ApplicationRoles.KitchenManager));

        ownerALimitedResponse.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);

        await AuthenticateAsync(client, TestDataSeeder.OwnerBEmail, TestDataSeeder.CorrectPassword);

        var ownerBResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}/users",
            CreateUserRequest("partition.b.staff@test.local", TestDataSeeder.CorrectPassword, ApplicationRoles.RestaurantManager));

        ownerBResponse.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    private static object CreateUserRequest(string email, string password, string role) =>
        new
        {
            Email = email,
            Password = password,
            FullName = "Staff User",
            PhoneNumber = "+1000000000",
            Role = role
        };

    private static async Task AuthenticateAsync(HttpClient client, string email, string password)
    {
        var token = await LoginAndGetTokenAsync(client, email, password);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private static async Task<string> LoginAndGetTokenAsync(HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { Email = email, Password = password });
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<LoginResponseModel>(JsonOptions);
        payload.Should().NotBeNull();
        payload!.AccessToken.Should().NotBeNullOrWhiteSpace();
        return payload.AccessToken;
    }

    private static HttpClient CreateHttpsClient(WebApplicationFactory<Program> factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

    private sealed class LoginResponseModel
    {
        public string AccessToken { get; init; } = string.Empty;
    }
}

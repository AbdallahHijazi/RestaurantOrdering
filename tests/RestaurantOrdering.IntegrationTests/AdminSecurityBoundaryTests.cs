using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class AdminSecurityBoundaryTests : IClassFixture<TestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public AdminSecurityBoundaryTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsTokenAndExpectedPayload()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new
            {
                Email = TestDataSeeder.OwnerAEmail,
                Password = TestDataSeeder.CorrectPassword
            });

        var responseBody = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.OK, $"body: {responseBody}");

        var payload = JsonSerializer.Deserialize<LoginResponseModel>(responseBody, JsonOptions);
        payload.Should().NotBeNull();
        payload!.AccessToken.Should().NotBeNullOrWhiteSpace();
        payload.ExpiresAtUtc.Should().BeAfter(DateTime.UtcNow);
        payload.UserId.Should().Be(TestDataSeeder.OwnerAUserId);
        payload.RestaurantId.Should().Be(TestDataSeeder.RestaurantAId);
    }

    [Fact]
    public async Task Login_WithWrongPassword_Returns401WithGenericMessage()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new
            {
                Email = TestDataSeeder.OwnerAEmail,
                Password = "wrong-password"
            });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Invalid email or password.");
    }

    [Fact]
    public async Task Login_WithUnknownEmail_Returns401WithSameGenericMessage()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new
            {
                Email = "missing@test.local",
                Password = TestDataSeeder.CorrectPassword
            });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Invalid email or password.");
    }

    [Fact]
    public async Task Login_AfterFiveFailedAttempts_LocksUserAndRejectsCorrectPassword()
    {
        using var isolatedFactory = new TestWebApplicationFactory();
        await TestDataSeeder.SeedAsync(isolatedFactory.Services);
        using var client = CreateHttpsClient(isolatedFactory);

        for (var attempt = 1; attempt <= 5; attempt++)
        {
            var failedResponse = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new
                {
                    Email = TestDataSeeder.LockoutEmail,
                    Password = "wrong-password"
                });

            failedResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
            var failedBody = await failedResponse.Content.ReadAsStringAsync();
            failedBody.Should().Contain("Invalid email or password.");
        }

        var lockedResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new
            {
                Email = TestDataSeeder.LockoutEmail,
                Password = TestDataSeeder.CorrectPassword
            });

        lockedResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var lockedBody = await lockedResponse.Content.ReadAsStringAsync();
        lockedBody.Should().Contain("Invalid email or password.");
    }

    [Fact]
    public async Task Login_ExceedingRateLimit_Returns429()
    {
        using var isolatedFactory = new TestWebApplicationFactory();
        await TestDataSeeder.SeedAsync(isolatedFactory.Services);
        using var client = CreateHttpsClient(isolatedFactory);

        for (var attempt = 1; attempt <= 8; attempt++)
        {
            var response = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new
                {
                    Email = "rate.limit@test.local",
                    Password = "wrong-password"
                });

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        var limitedResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new
            {
                Email = "rate.limit@test.local",
                Password = "wrong-password"
            });

        limitedResponse.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        var problem = await limitedResponse.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        problem.Should().NotBeNull();
        problem!.Status.Should().Be(StatusCodes.Status429TooManyRequests);
        problem.Title.Should().Be("Too many requests.");
    }

    [Fact]
    public async Task AdminEndpoint_WithoutToken_Returns401()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.GetAsync($"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task AdminEndpoint_WithInvalidToken_Returns401()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "not-a-valid-jwt");

        var response = await client.GetAsync($"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task OwnerA_CanAccessOwnRestaurant_ButCannotAccessOrModifyRestaurantB()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        var accessToken = await LoginAndGetTokenAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        var filesBeforeUnauthorizedUpload = GetAllFiles(_factory.UploadsRootPath);

        var ownGetResponse = await client.GetAsync($"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}");
        ownGetResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var foreignGetResponse = await client.GetAsync($"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}");
        foreignGetResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var updateRestaurantResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}",
            new
            {
                Slug = "restaurant-b-new",
                NameAr = "مطعم ب جديد",
                NameEn = "Restaurant B Updated",
                DescriptionAr = "وصف",
                DescriptionEn = "Description",
                PhoneNumber = "+2222222222",
                WhatsAppNumber = "+2222222222",
                AddressAr = "عنوان",
                AddressEn = "Address",
                Latitude = (decimal?)null,
                Longitude = (decimal?)null
            });
        updateRestaurantResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var getSettingsResponse = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}/settings");
        getSettingsResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var updateSettingsResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}/settings",
            new
            {
                CurrencyCode = "SAR",
                TimeZone = "Asia/Riyadh",
                TaxRate = 15m,
                DeliveryFee = 0m,
                MinimumOrderAmount = 0m,
                IsDeliveryEnabled = true,
                IsPickupEnabled = true,
                WorkingHoursJson = (string?)null
            });
        updateSettingsResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);

        using var imageContent = new ByteArrayContent(new byte[] { 1, 2, 3, 4 });
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        using var formData = new MultipartFormDataContent
        {
            {
                imageContent,
                "file",
                "logo.png"
            }
        };
        var uploadResponse = await client.PostAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}/media",
            formData);
        uploadResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var filesAfterUnauthorizedUpload = GetAllFiles(_factory.UploadsRootPath);
        filesAfterUnauthorizedUpload.Should().BeEquivalentTo(filesBeforeUnauthorizedUpload);

        var setLogoResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}/logo",
            new { MediaFileId = TestDataSeeder.RestaurantBMediaId });
        setLogoResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var mediaCountForRestaurantB = dbContext.MediaFiles.Count(item => item.RestaurantId == TestDataSeeder.RestaurantBId);
        mediaCountForRestaurantB.Should().Be(1);
    }

    [Fact]
    public async Task PublicEndpoints_StayAccessibleWithoutToken()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var publicRestaurant = await client.GetAsync("/api/v1/public/restaurants/restaurant-a");
        publicRestaurant.StatusCode.Should().Be(HttpStatusCode.OK);

        var publicMenu = await client.GetAsync("/api/v1/public/restaurants/restaurant-a/menu");
        publicMenu.StatusCode.Should().Be(HttpStatusCode.OK);
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

    private HttpClient CreateHttpsClient() =>
        CreateHttpsClient(_factory);

    private static HttpClient CreateHttpsClient(WebApplicationFactory<Program> factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

    private static IReadOnlyCollection<string> GetAllFiles(string rootPath)
    {
        if (!Directory.Exists(rootPath))
        {
            return Array.Empty<string>();
        }

        return Directory
            .EnumerateFiles(rootPath, "*", SearchOption.AllDirectories)
            .Select(path => Path.GetRelativePath(rootPath, path))
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private sealed class LoginResponseModel
    {
        public string AccessToken { get; init; } = string.Empty;
        public DateTime ExpiresAtUtc { get; init; }
        public Guid UserId { get; init; }
        public Guid? RestaurantId { get; init; }
    }
}


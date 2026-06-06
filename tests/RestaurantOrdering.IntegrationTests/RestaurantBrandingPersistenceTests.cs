using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class RestaurantBrandingPersistenceTests : IClassFixture<TestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public RestaurantBrandingPersistenceTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task UpdateRestaurant_WithValidAccentColor_Returns200()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}",
            CreateRestaurantPayload(accentColor: "#FF5500"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<RestaurantResponse>(JsonOptions);
        payload!.AccentColor.Should().Be("#FF5500");
    }

    [Fact]
    public async Task UpdateRestaurant_WithInvalidAccentColor_Returns400()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}",
            CreateRestaurantPayload(accentColor: "red"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetRestaurant_ReturnsPersistedAccentColor()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        (await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}",
            CreateRestaurantPayload(accentColor: "#AABBCC"))).EnsureSuccessStatusCode();

        var getResponse = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}");

        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await getResponse.Content.ReadFromJsonAsync<RestaurantResponse>(JsonOptions);
        payload!.AccentColor.Should().Be("#AABBCC");
    }

    [Fact]
    public async Task PublicMenu_ReturnsPersistedAccentColor()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var ownerClient = CreateHttpsClient();
        await AuthenticateAsync(ownerClient, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        (await ownerClient.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}",
            CreateRestaurantPayload(accentColor: "#112233"))).EnsureSuccessStatusCode();

        using var publicClient = CreateHttpsClient();
        var menu = await publicClient.GetFromJsonAsync<PublicMenuResponse>(
            "/api/v1/public/restaurants/restaurant-a/menu",
            JsonOptions);

        menu!.AccentColor.Should().Be("#112233");
    }

    [Fact]
    public async Task SetLogo_AsOwner_Returns200()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var uploaded = await UploadPngAsync(client, TestDataSeeder.RestaurantAId);
        uploaded.StatusCode.Should().Be(HttpStatusCode.Created);
        var media = await uploaded.Content.ReadFromJsonAsync<UploadedMediaResponse>(JsonOptions);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/logo",
            new { MediaFileId = media!.Id });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetRestaurant_ReturnsLogoUrl()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var uploaded = await UploadPngAsync(client, TestDataSeeder.RestaurantAId);
        var media = await uploaded.Content.ReadFromJsonAsync<UploadedMediaResponse>(JsonOptions);

        (await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/logo",
            new { MediaFileId = media!.Id })).EnsureSuccessStatusCode();

        var getResponse = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}");

        var payload = await getResponse.Content.ReadFromJsonAsync<RestaurantResponse>(JsonOptions);
        payload!.LogoFileId.Should().Be(media.Id);
        payload.LogoUrl.Should().Be(media.FileUrl);
        payload.StoredFileName.Should().BeNull();
    }

    [Fact]
    public async Task PublicMenu_ReturnsLogoUrl()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var ownerClient = CreateHttpsClient();
        await AuthenticateAsync(ownerClient, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var uploaded = await UploadPngAsync(ownerClient, TestDataSeeder.RestaurantAId);
        var media = await uploaded.Content.ReadFromJsonAsync<UploadedMediaResponse>(JsonOptions);

        (await ownerClient.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/logo",
            new { MediaFileId = media!.Id })).EnsureSuccessStatusCode();

        using var publicClient = CreateHttpsClient();
        var menu = await publicClient.GetFromJsonAsync<PublicMenuResponse>(
            "/api/v1/public/restaurants/restaurant-a/menu",
            JsonOptions);

        menu!.LogoUrl.Should().Be(media.FileUrl);
    }

    [Fact]
    public async Task SetLogo_WithMediaFromAnotherRestaurant_Returns404()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/logo",
            new { MediaFileId = TestDataSeeder.RestaurantBMediaId });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SetLogo_AsManager_Returns404BecauseOwnershipBehaviorHidesResource()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/logo",
            new { MediaFileId = TestDataSeeder.RestaurantAMediaId });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SetLogo_Anonymous_Returns401()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/logo",
            new { MediaFileId = TestDataSeeder.RestaurantAMediaId });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SetCoverImage_AsOwner_Returns200()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var uploaded = await UploadPngAsync(client, TestDataSeeder.RestaurantAId);
        var media = await uploaded.Content.ReadFromJsonAsync<UploadedMediaResponse>(JsonOptions);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/cover-image",
            new { MediaFileId = media!.Id });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetRestaurant_ReturnsCoverImageUrl()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var uploaded = await UploadPngAsync(client, TestDataSeeder.RestaurantAId);
        var media = await uploaded.Content.ReadFromJsonAsync<UploadedMediaResponse>(JsonOptions);

        (await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/cover-image",
            new { MediaFileId = media!.Id })).EnsureSuccessStatusCode();

        var payload = await (await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}"))
            .Content.ReadFromJsonAsync<RestaurantResponse>(JsonOptions);

        payload!.CoverImageFileId.Should().Be(media.Id);
        payload.CoverImageUrl.Should().Be(media.FileUrl);
    }

    [Fact]
    public async Task PublicMenu_ReturnsCoverImageUrl()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var ownerClient = CreateHttpsClient();
        await AuthenticateAsync(ownerClient, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var uploaded = await UploadPngAsync(ownerClient, TestDataSeeder.RestaurantAId);
        var media = await uploaded.Content.ReadFromJsonAsync<UploadedMediaResponse>(JsonOptions);

        (await ownerClient.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/cover-image",
            new { MediaFileId = media!.Id })).EnsureSuccessStatusCode();

        using var publicClient = CreateHttpsClient();
        var menu = await publicClient.GetFromJsonAsync<PublicMenuResponse>(
            "/api/v1/public/restaurants/restaurant-a/menu",
            JsonOptions);

        menu!.CoverImageUrl.Should().Be(media.FileUrl);
    }

    [Fact]
    public async Task SetCoverImage_WithMediaFromAnotherRestaurant_Returns404()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/cover-image",
            new { MediaFileId = TestDataSeeder.RestaurantBMediaId });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SetCoverImage_AsManager_Returns404BecauseOwnershipBehaviorHidesResource()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/cover-image",
            new { MediaFileId = TestDataSeeder.RestaurantAMediaId });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SetCoverImage_AsKitchenManager_Returns404BecauseOwnershipBehaviorHidesResource()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/cover-image",
            new { MediaFileId = TestDataSeeder.RestaurantAMediaId });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SetCoverImage_Anonymous_Returns401()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/cover-image",
            new { MediaFileId = TestDataSeeder.RestaurantAMediaId });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SetCoverImage_ForAnotherRestaurant_Returns404()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}/cover-image",
            new { MediaFileId = TestDataSeeder.RestaurantAMediaId });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SoftDeletedCoverMedia_Returns404()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        var softDeletedMediaId = Guid.Parse("aaaaaaaa-eeee-eeee-eeee-eeeeeeeeeeee");
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            dbContext.MediaFiles.Add(
                new MediaFile
                {
                    Id = softDeletedMediaId,
                    RestaurantId = TestDataSeeder.RestaurantAId,
                    FileName = "deleted-cover.png",
                    StoredFileName = "deleted-cover-stored.png",
                    OriginalFileName = "deleted-cover.png",
                    FileUrl = "/uploads/test/deleted-cover.png",
                    ContentType = "image/png",
                    FileSizeBytes = 128,
                    IsDeleted = true,
                    CreatedAt = DateTime.UtcNow
                });
            await dbContext.SaveChangesAsync();
        }

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/cover-image",
            new { MediaFileId = softDeletedMediaId });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PublicMenu_Anonymous_StillReturns200()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.GetAsync("/api/v1/public/restaurants/restaurant-a/menu");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task RestaurantProfileSecurity_RemainsOwnerOnly()
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
    public async Task MenuManagementSecurity_RemainsUnchanged()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        (await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories")).StatusCode
            .Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PublicMenu_DoesNotExposeSensitiveMediaFileFields()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var ownerClient = CreateHttpsClient();
        await AuthenticateAsync(ownerClient, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var uploaded = await UploadPngAsync(ownerClient, TestDataSeeder.RestaurantAId);
        var media = await uploaded.Content.ReadFromJsonAsync<UploadedMediaResponse>(JsonOptions);

        (await ownerClient.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/logo",
            new { MediaFileId = media!.Id })).EnsureSuccessStatusCode();

        using var publicClient = CreateHttpsClient();
        var body = await publicClient.GetStringAsync("/api/v1/public/restaurants/restaurant-a/menu");

        body.Should().Contain("logoUrl");
        body.Should().NotContain("storedFileName");
        body.Should().NotContain("originalFileName");
        body.Should().NotContain("StoredFileName");
        body.Should().NotContain("OriginalFileName");
    }

    private static object CreateRestaurantPayload(string accentColor = "#B8663F") =>
        new
        {
            Slug = "restaurant-a",
            NameAr = "مطعم أ",
            NameEn = "Restaurant A",
            DescriptionAr = (string?)null,
            DescriptionEn = (string?)null,
            PhoneNumber = "+1111111111",
            WhatsAppNumber = (string?)null,
            AddressAr = (string?)null,
            AddressEn = (string?)null,
            Latitude = (decimal?)null,
            Longitude = (decimal?)null,
            AccentColor = accentColor
        };

    private static async Task<HttpResponseMessage> UploadPngAsync(HttpClient client, Guid restaurantId)
    {
        using var imageContent = new ByteArrayContent(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        using var formData = new MultipartFormDataContent
        {
            { imageContent, "file", "branding.png" }
        };

        return await client.PostAsync(
            $"/api/v1/admin/restaurants/{restaurantId}/media",
            formData);
    }

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

    private sealed class UploadedMediaResponse
    {
        public Guid Id { get; init; }
        public string FileUrl { get; init; } = string.Empty;
    }

    private sealed class RestaurantResponse
    {
        public Guid? LogoFileId { get; init; }
        public string? LogoUrl { get; init; }
        public Guid? CoverImageFileId { get; init; }
        public string? CoverImageUrl { get; init; }
        public string AccentColor { get; init; } = string.Empty;
        public string? StoredFileName { get; init; }
    }

    private sealed class PublicMenuResponse
    {
        public string? LogoUrl { get; init; }
        public string? CoverImageUrl { get; init; }
        public string AccentColor { get; init; } = string.Empty;
    }
}

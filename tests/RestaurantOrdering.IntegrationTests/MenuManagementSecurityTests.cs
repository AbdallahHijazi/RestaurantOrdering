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

public sealed class MenuManagementSecurityTests : IClassFixture<TestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public MenuManagementSecurityTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Categories_GetList_Anonymous_Returns401()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Categories_Create_Anonymous_Returns401()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories",
            CreateCategoryPayload("فئة", "Category", 2));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task MenuItems_GetList_Anonymous_Returns401()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task MenuItems_Create_Anonymous_Returns401()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items",
            CreateMenuItemPayload(TestDataSeeder.CategoryAId, "صنف", "Item", 10m));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task MediaUpload_Anonymous_Returns401()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await UploadPngAsync(client, TestDataSeeder.RestaurantAId);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Categories_OwnerCanListCreateUpdateDelete()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var listResponse = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories");
        listResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories",
            CreateCategoryPayload("فئة جديدة", "New Category", 2));
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<CategoryResponse>(JsonOptions);
        created.Should().NotBeNull();

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories/{created!.Id}",
            CreateCategoryPayload("فئة محدثة", "Updated Category", 3, isActive: false));
        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var deleteResponse = await client.DeleteAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories/{created.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task MenuItems_OwnerCanListCreateUpdateDelete()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var listResponse = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items");
        listResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items",
            CreateMenuItemPayload(TestDataSeeder.CategoryAId, "صنف جديد", "New Item", 15m));
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<MenuItemResponse>(JsonOptions);
        created.Should().NotBeNull();

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items/{created!.Id}",
            CreateMenuItemPayload(
                TestDataSeeder.CategoryAId,
                "صنف محدث",
                "Updated Item",
                18m,
                isAvailable: false));
        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var deleteResponse = await client.DeleteAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items/{created.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task MediaUpload_OwnerOwnRestaurant_Returns201()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await UploadPngAsync(client, TestDataSeeder.RestaurantAId);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task SetLogo_OwnerOwnRestaurant_Succeeds()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var uploadResponse = await UploadPngAsync(client, TestDataSeeder.RestaurantAId);
        uploadResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var uploaded = await uploadResponse.Content.ReadFromJsonAsync<UploadedMediaResponse>(JsonOptions);

        var setLogoResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/logo",
            new { MediaFileId = uploaded!.Id });

        setLogoResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Categories_ManagerCanListCreateUpdateDelete()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        (await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories")).StatusCode
            .Should().Be(HttpStatusCode.OK);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories",
            CreateCategoryPayload("فئة مدير", "Manager Category", 4));
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<CategoryResponse>(JsonOptions);

        (await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories/{created!.Id}",
            CreateCategoryPayload("فئة مدير محدثة", "Updated Manager Category", 5))).StatusCode
            .Should().Be(HttpStatusCode.OK);

        (await client.DeleteAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories/{created.Id}")).StatusCode
            .Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task MenuItems_ManagerCanListCreateUpdateDelete()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        (await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items")).StatusCode
            .Should().Be(HttpStatusCode.OK);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items",
            CreateMenuItemPayload(TestDataSeeder.CategoryAId, "صنف مدير", "Manager Item", 12m));
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<MenuItemResponse>(JsonOptions);

        (await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items/{created!.Id}",
            CreateMenuItemPayload(
                TestDataSeeder.CategoryAId,
                "صنف مدير محدث",
                "Updated Manager Item",
                14m))).StatusCode
            .Should().Be(HttpStatusCode.OK);

        (await client.DeleteAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items/{created.Id}")).StatusCode
            .Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task MediaUpload_ManagerOwnRestaurant_Returns201()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        var response = await UploadPngAsync(client, TestDataSeeder.RestaurantAId);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task SetLogo_Manager_Returns404BecauseOwnershipBehaviorHidesResource()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/logo",
            new { MediaFileId = TestDataSeeder.RestaurantBMediaId });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Categories_KitchenManager_Returns403()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task MenuItems_KitchenManager_Returns403()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task MediaUpload_KitchenManager_Returns403()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        var response = await UploadPngAsync(client, TestDataSeeder.RestaurantAId);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Categories_ManagerForAnotherRestaurant_Returns404()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}/categories");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task MenuItems_OwnerForAnotherRestaurant_Returns404()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}/menu-items");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task MediaUpload_ManagerForAnotherRestaurant_Returns404()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        var response = await UploadPngAsync(client, TestDataSeeder.RestaurantBId);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CreateMenuItem_WithCategoryFromAnotherRestaurant_Returns404()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items",
            CreateMenuItemPayload(TestDataSeeder.CategoryBId, "صنف", "Item", 10m));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CreateMenuItem_WithMediaFileFromAnotherRestaurant_Returns404()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items",
            new
            {
                CategoryId = TestDataSeeder.CategoryAId,
                ImageFileId = TestDataSeeder.RestaurantBMediaId,
                NameAr = "صنف",
                NameEn = "Item",
                DescriptionAr = (string?)null,
                DescriptionEn = (string?)null,
                Price = 10m,
                DiscountPrice = (decimal?)null,
                DisplayOrder = 1,
                IsAvailable = true,
                IsActive = true
            });

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
    public async Task PublicMenu_DoesNotExposeInactiveOrUnavailableItems()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var seededAt = DateTime.UtcNow;

            dbContext.Categories.Add(
                new Category
                {
                    Id = Guid.Parse("aaaaaaaa-cccc-cccc-cccc-cccccccccc01"),
                    RestaurantId = TestDataSeeder.RestaurantAId,
                    NameAr = "فئة غير نشطة",
                    NameEn = "Inactive Category",
                    DisplayOrder = 99,
                    IsActive = false,
                    CreatedAt = seededAt
                });

            dbContext.MenuItems.AddRange(
                new MenuItem
                {
                    Id = Guid.Parse("aaaaaaaa-dddd-dddd-dddd-dddddddddd01"),
                    RestaurantId = TestDataSeeder.RestaurantAId,
                    CategoryId = TestDataSeeder.CategoryAId,
                    NameAr = "صنف غير متاح",
                    NameEn = "Unavailable Item",
                    Price = 5m,
                    DisplayOrder = 99,
                    IsAvailable = false,
                    IsActive = true,
                    CreatedAt = seededAt
                },
                new MenuItem
                {
                    Id = Guid.Parse("aaaaaaaa-dddd-dddd-dddd-dddddddddd02"),
                    RestaurantId = TestDataSeeder.RestaurantAId,
                    CategoryId = TestDataSeeder.CategoryAId,
                    NameAr = "صنف غير نشط",
                    NameEn = "Inactive Item",
                    Price = 6m,
                    DisplayOrder = 100,
                    IsAvailable = true,
                    IsActive = false,
                    CreatedAt = seededAt
                });

            await dbContext.SaveChangesAsync();
        }

        using var client = CreateHttpsClient();
        var response = await client.GetAsync("/api/v1/public/restaurants/restaurant-a/menu");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Test Item");
        body.Should().NotContain("Inactive Category");
        body.Should().NotContain("Unavailable Item");
        body.Should().NotContain("Inactive Item");
    }

    [Fact]
    public async Task RestaurantUsersController_RemainsOwnerOnly()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
            new
            {
                Email = "blocked-staff@test.local",
                Password = TestDataSeeder.CorrectPassword,
                FullName = "Blocked Staff",
                Role = ApplicationRoles.RestaurantManager
            });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task OrdersController_AccessRulesRemainUnchanged()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        (await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/orders")).StatusCode
            .Should().Be(HttpStatusCode.OK);

        (await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}/categories")).StatusCode
            .Should().Be(HttpStatusCode.Forbidden);
    }

    private static object CreateCategoryPayload(
        string nameAr,
        string nameEn,
        int displayOrder,
        bool isActive = true) =>
        new
        {
            NameAr = nameAr,
            NameEn = nameEn,
            DescriptionAr = (string?)null,
            DescriptionEn = (string?)null,
            DisplayOrder = displayOrder,
            IsActive = isActive
        };

    private static object CreateMenuItemPayload(
        Guid categoryId,
        string nameAr,
        string nameEn,
        decimal price,
        bool isAvailable = true,
        bool isActive = true) =>
        new
        {
            CategoryId = categoryId,
            ImageFileId = (Guid?)null,
            NameAr = nameAr,
            NameEn = nameEn,
            DescriptionAr = (string?)null,
            DescriptionEn = (string?)null,
            Price = price,
            DiscountPrice = (decimal?)null,
            DisplayOrder = 1,
            IsAvailable = isAvailable,
            IsActive = isActive
        };

    private static async Task<HttpResponseMessage> UploadPngAsync(HttpClient client, Guid restaurantId)
    {
        using var imageContent = new ByteArrayContent(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        using var formData = new MultipartFormDataContent
        {
            { imageContent, "file", "menu-item.png" }
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

    private sealed class CategoryResponse
    {
        public Guid Id { get; init; }
    }

    private sealed class MenuItemResponse
    {
        public Guid Id { get; init; }
    }

    private sealed class UploadedMediaResponse
    {
        public Guid Id { get; init; }
    }
}

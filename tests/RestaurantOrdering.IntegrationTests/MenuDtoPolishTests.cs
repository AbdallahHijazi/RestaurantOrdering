using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class MenuDtoPolishTests : IClassFixture<TestWebApplicationFactory>
{
    private const string ExpectedImageUrl = "/uploads/test/menu-item-a-stored.png";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public MenuDtoPolishTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Categories_GetList_ReturnsItemCount()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = await CreateAuthenticatedOwnerClientAsync();

        var categories = await client.GetFromJsonAsync<List<CategoryResponse>>(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories",
            JsonOptions);

        categories.Should().NotBeNull();
        categories!.Single(c => c.Id == TestDataSeeder.CategoryAId).ItemCount.Should().Be(1);
    }

    [Fact]
    public async Task Categories_GetById_ReturnsItemCount()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = await CreateAuthenticatedOwnerClientAsync();

        var category = await client.GetFromJsonAsync<CategoryResponse>(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories/{TestDataSeeder.CategoryAId}",
            JsonOptions);

        category.Should().NotBeNull();
        category!.ItemCount.Should().Be(1);
    }

    [Fact]
    public async Task Category_NewCategory_ReturnsItemCountZero()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = await CreateAuthenticatedOwnerClientAsync();

        var createResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories",
            new
            {
                NameAr = "فئة فارغة",
                NameEn = "Empty Category",
                DescriptionAr = (string?)null,
                DescriptionEn = (string?)null,
                DisplayOrder = 99,
                IsActive = true
            });

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<CategoryResponse>(JsonOptions);
        created!.ItemCount.Should().Be(0);
    }

    [Fact]
    public async Task Category_ItemCount_ExcludesSoftDeletedItems()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            dbContext.MenuItems.Add(new MenuItem
            {
                Id = Guid.Parse("aaaaaaaa-eeee-eeee-eeee-eeeeeeeeee01"),
                RestaurantId = TestDataSeeder.RestaurantAId,
                CategoryId = TestDataSeeder.CategoryAId,
                NameAr = "صنف محذوف",
                NameEn = "Deleted Item",
                Price = 9m,
                DisplayOrder = 2,
                IsAvailable = true,
                IsActive = true,
                IsDeleted = true,
                CreatedAt = DateTime.UtcNow
            });
            await dbContext.SaveChangesAsync();
        }

        using var client = await CreateAuthenticatedOwnerClientAsync();
        var category = await client.GetFromJsonAsync<CategoryResponse>(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories/{TestDataSeeder.CategoryAId}",
            JsonOptions);

        category!.ItemCount.Should().Be(1);
    }

    [Fact]
    public async Task Category_ItemCount_IncludesInactiveAndUnavailableItems()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            dbContext.MenuItems.AddRange(
                new MenuItem
                {
                    Id = Guid.Parse("aaaaaaaa-ffff-ffff-ffff-ffffffffff01"),
                    RestaurantId = TestDataSeeder.RestaurantAId,
                    CategoryId = TestDataSeeder.CategoryAId,
                    NameAr = "صنف غير نشط",
                    NameEn = "Inactive Item",
                    Price = 11m,
                    DisplayOrder = 3,
                    IsAvailable = true,
                    IsActive = false,
                    IsDeleted = false,
                    CreatedAt = DateTime.UtcNow
                },
                new MenuItem
                {
                    Id = Guid.Parse("aaaaaaaa-ffff-ffff-ffff-ffffffffff02"),
                    RestaurantId = TestDataSeeder.RestaurantAId,
                    CategoryId = TestDataSeeder.CategoryAId,
                    NameAr = "صنف غير متاح",
                    NameEn = "Unavailable Item",
                    Price = 12m,
                    DisplayOrder = 4,
                    IsAvailable = false,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = DateTime.UtcNow
                });
            await dbContext.SaveChangesAsync();
        }

        using var client = await CreateAuthenticatedOwnerClientAsync();
        var category = await client.GetFromJsonAsync<CategoryResponse>(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories/{TestDataSeeder.CategoryAId}",
            JsonOptions);

        category!.ItemCount.Should().Be(3);
    }

    [Fact]
    public async Task MenuItems_GetList_ReturnsImageUrl()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = await CreateAuthenticatedOwnerClientAsync();

        var menuItems = await client.GetFromJsonAsync<List<MenuItemResponse>>(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items",
            JsonOptions);

        menuItems!.Single(item => item.Id == TestDataSeeder.MenuItemAId).ImageUrl
            .Should().Be(ExpectedImageUrl);
    }

    [Fact]
    public async Task MenuItems_GetById_ReturnsImageUrl()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = await CreateAuthenticatedOwnerClientAsync();

        var menuItem = await client.GetFromJsonAsync<MenuItemResponse>(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items/{TestDataSeeder.MenuItemAId}",
            JsonOptions);

        menuItem!.ImageUrl.Should().Be(ExpectedImageUrl);
    }

    [Fact]
    public async Task MenuItem_WithoutImage_ReturnsNullImageUrl()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var seededItem = await dbContext.MenuItems
                .SingleAsync(item => item.Id == TestDataSeeder.MenuItemAId);
            seededItem.ImageFileId = null;
            await dbContext.SaveChangesAsync();
        }

        using var client = await CreateAuthenticatedOwnerClientAsync();
        var responseItem = await client.GetFromJsonAsync<MenuItemResponse>(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items/{TestDataSeeder.MenuItemAId}",
            JsonOptions);

        responseItem!.ImageFileId.Should().BeNull();
        responseItem.ImageUrl.Should().BeNull();
    }

    [Fact]
    public async Task MenuItem_ImageUrl_DoesNotExposeStoredFileNameField()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = await CreateAuthenticatedOwnerClientAsync();

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items/{TestDataSeeder.MenuItemAId}");

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("\"imageUrl\":\"/uploads/test/menu-item-a-stored.png\"");
        body.Should().NotContain("StoredFileName");
        body.Should().NotContain("\"storedFileName\"");
    }

    [Fact]
    public async Task PublicMenu_ReturnsImageUrl()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var menu = await client.GetFromJsonAsync<PublicMenuResponse>(
            "/api/v1/public/restaurants/restaurant-a/menu",
            JsonOptions);

        menu!.Categories
            .SelectMany(category => category.Items)
            .Single(item => item.Id == TestDataSeeder.MenuItemAId)
            .ImageUrl
            .Should()
            .Be(ExpectedImageUrl);
    }

    [Fact]
    public async Task PublicMenu_ItemWithoutImage_ReturnsNullImageUrl()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var menuItem = await dbContext.MenuItems
                .SingleAsync(item => item.Id == TestDataSeeder.MenuItemAId);
            menuItem.ImageFileId = null;
            await dbContext.SaveChangesAsync();
        }

        using var client = CreateHttpsClient();
        var menu = await client.GetFromJsonAsync<PublicMenuResponse>(
            "/api/v1/public/restaurants/restaurant-a/menu",
            JsonOptions);

        menu!.Categories
            .SelectMany(category => category.Items)
            .Single(item => item.Id == TestDataSeeder.MenuItemAId)
            .ImageUrl
            .Should()
            .BeNull();
    }

    [Fact]
    public async Task PublicMenu_StillExcludesInactiveUnavailableDeletedItems()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var seededAt = DateTime.UtcNow;

            dbContext.Categories.Add(new Category
            {
                Id = Guid.Parse("aaaaaaaa-cccc-cccc-cccc-cccccccccc02"),
                RestaurantId = TestDataSeeder.RestaurantAId,
                NameAr = "فئة عامة غير نشطة",
                NameEn = "Public Inactive Category",
                DisplayOrder = 98,
                IsActive = false,
                CreatedAt = seededAt
            });

            dbContext.MenuItems.AddRange(
                new MenuItem
                {
                    Id = Guid.Parse("aaaaaaaa-dddd-dddd-dddd-dddddddddd03"),
                    RestaurantId = TestDataSeeder.RestaurantAId,
                    CategoryId = TestDataSeeder.CategoryAId,
                    NameAr = "صنف عام غير متاح",
                    NameEn = "Public Unavailable Item",
                    Price = 5m,
                    DisplayOrder = 98,
                    IsAvailable = false,
                    IsActive = true,
                    CreatedAt = seededAt
                },
                new MenuItem
                {
                    Id = Guid.Parse("aaaaaaaa-dddd-dddd-dddd-dddddddddd04"),
                    RestaurantId = TestDataSeeder.RestaurantAId,
                    CategoryId = TestDataSeeder.CategoryAId,
                    NameAr = "صنف عام غير نشط",
                    NameEn = "Public Inactive Item",
                    Price = 6m,
                    DisplayOrder = 99,
                    IsAvailable = true,
                    IsActive = false,
                    CreatedAt = seededAt
                });

            await dbContext.SaveChangesAsync();
        }

        using var client = CreateHttpsClient();
        var body = await client.GetStringAsync("/api/v1/public/restaurants/restaurant-a/menu");

        body.Should().Contain("Test Item");
        body.Should().NotContain("Public Inactive Category");
        body.Should().NotContain("Public Unavailable Item");
        body.Should().NotContain("Public Inactive Item");
    }

    [Fact]
    public async Task Response_DoesNotExposeInternalStorageFields()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = await CreateAuthenticatedOwnerClientAsync();

        var categoriesBody = await client.GetStringAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories");
        var menuItemsBody = await client.GetStringAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items");
        var publicMenuBody = await client.GetStringAsync("/api/v1/public/restaurants/restaurant-a/menu");

        foreach (var body in new[] { categoriesBody, menuItemsBody, publicMenuBody })
        {
            body.Should().NotContain("StoredFileName");
            body.Should().NotContain("OriginalFileName");
            body.Should().NotContain("PasswordHash");
            body.Should().NotContain("SecurityStamp");
        }
    }

    private async Task<HttpClient> CreateAuthenticatedOwnerClientAsync()
    {
        var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);
        return client;
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
        public int ItemCount { get; init; }
    }

    private sealed class MenuItemResponse
    {
        public Guid Id { get; init; }
        public Guid? ImageFileId { get; init; }
        public string? ImageUrl { get; init; }
    }

    private sealed class PublicMenuResponse
    {
        public List<PublicMenuCategoryResponse> Categories { get; init; } = [];
    }

    private sealed class PublicMenuCategoryResponse
    {
        public List<PublicMenuItemResponse> Items { get; init; } = [];
    }

    private sealed class PublicMenuItemResponse
    {
        public Guid Id { get; init; }
        public string? ImageUrl { get; init; }
    }
}

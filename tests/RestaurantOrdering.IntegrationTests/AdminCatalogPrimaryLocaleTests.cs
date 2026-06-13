using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class AdminCatalogPrimaryLocaleTests : IClassFixture<TestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public AdminCatalogPrimaryLocaleTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Categories_List_ReturnsPrimaryNameForFrenchDefaultLocale()
    {
        await SeedFrenchPrimaryScenarioAsync();

        using var client = await CreateAuthenticatedOwnerClientAsync();
        var categories = await client.GetFromJsonAsync<List<AdminCategoryResponse>>(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories",
            JsonOptions);

        var category = categories!.Single(item => item.Id == TestDataSeeder.CategoryAId);
        category.PrimaryName.Should().Be("Category FR");
        category.PrimaryLocale.Should().Be("fr");
        category.PrimaryFallbackApplied.Should().BeFalse();
        category.NameAr.Should().Be("فئة اختبار");
        category.NameEn.Should().Be("Test Category");
    }

    [Fact]
    public async Task MenuItems_List_ReturnsPrimaryNameForGermanDefaultLocale()
    {
        await SeedGermanPrimaryScenarioAsync();

        using var client = await CreateAuthenticatedOwnerClientAsync();
        var items = await client.GetFromJsonAsync<List<AdminMenuItemResponse>>(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items",
            JsonOptions);

        var item = items!.Single(entry => entry.Id == TestDataSeeder.MenuItemAId);
        item.PrimaryName.Should().Be("Item DE");
        item.PrimaryLocale.Should().Be("de");
        item.PrimaryFallbackApplied.Should().BeFalse();
        item.NameAr.Should().Be("صنف اختبار");
    }

    [Fact]
    public async Task Categories_List_IgnoresDraftOnlyFrenchTranslation()
    {
        await SeedFrenchPrimaryScenarioAsync(frenchPublished: false, frenchDraftOnly: true);

        using var client = await CreateAuthenticatedOwnerClientAsync();
        var categories = await client.GetFromJsonAsync<List<AdminCategoryResponse>>(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories",
            JsonOptions);

        var category = categories!.Single(item => item.Id == TestDataSeeder.CategoryAId);
        category.PrimaryName.Should().Be("Test Category");
        category.PrimaryLocale.Should().Be("en");
        category.PrimaryFallbackApplied.Should().BeTrue();
    }

    [Fact]
    public async Task MenuItems_List_IgnoresStaleGermanTranslation()
    {
        await SeedGermanPrimaryScenarioAsync(germanPublishedSourceVersion: 99);

        using var client = await CreateAuthenticatedOwnerClientAsync();
        var items = await client.GetFromJsonAsync<List<AdminMenuItemResponse>>(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items",
            JsonOptions);

        var item = items!.Single(entry => entry.Id == TestDataSeeder.MenuItemAId);
        item.PrimaryName.Should().Be("Test Item");
        item.PrimaryLocale.Should().Be("en");
        item.PrimaryFallbackApplied.Should().BeTrue();
    }

    [Fact]
    public async Task Categories_List_StillReturnsLegacyBilingualFields()
    {
        await SeedFrenchPrimaryScenarioAsync();

        using var client = await CreateAuthenticatedOwnerClientAsync();
        var categories = await client.GetFromJsonAsync<List<AdminCategoryResponse>>(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories",
            JsonOptions);

        var category = categories!.Single(item => item.Id == TestDataSeeder.CategoryAId);
        category.NameAr.Should().NotBeNullOrWhiteSpace();
        category.NameEn.Should().NotBeNullOrWhiteSpace();
    }

    private async Task SeedFrenchPrimaryScenarioAsync(
        bool frenchPublished = true,
        bool frenchDraftOnly = false,
        int? frenchPublishedSourceVersion = null)
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var settings = await context.RestaurantSettings.SingleAsync(item => item.RestaurantId == TestDataSeeder.RestaurantAId);
        settings.DefaultLocale = "fr";

        await EnsureSupportedLocaleAsync(context, "ar", 1);
        await EnsureSupportedLocaleAsync(context, "en", 2);
        await EnsureSupportedLocaleAsync(context, "fr", 3);

        var category = await context.Categories.SingleAsync(item => item.Id == TestDataSeeder.CategoryAId);
        var now = DateTime.UtcNow;

        UpsertCategoryTranslation(
            context,
            category,
            "fr",
            frenchPublished ? "Category FR" : null,
            frenchPublishedSourceVersion ?? category.ContentVersion,
            frenchDraftOnly ? "Draft FR Category" : null,
            now);

        await context.SaveChangesAsync();
    }

    private async Task SeedGermanPrimaryScenarioAsync(int? germanPublishedSourceVersion = null)
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var settings = await context.RestaurantSettings.SingleAsync(item => item.RestaurantId == TestDataSeeder.RestaurantAId);
        settings.DefaultLocale = "de";

        await EnsureSupportedLocaleAsync(context, "ar", 1);
        await EnsureSupportedLocaleAsync(context, "en", 2);
        await EnsureSupportedLocaleAsync(context, "de", 3);

        var menuItem = await context.MenuItems.SingleAsync(item => item.Id == TestDataSeeder.MenuItemAId);
        var now = DateTime.UtcNow;

        UpsertMenuItemTranslation(
            context,
            menuItem,
            "de",
            "Item DE",
            germanPublishedSourceVersion ?? menuItem.ContentVersion,
            null,
            now);

        await context.SaveChangesAsync();
    }

    private static async Task EnsureSupportedLocaleAsync(
        ApplicationDbContext context,
        string localeCode,
        int sortOrder,
        bool isEnabled = true)
    {
        var locale = await context.RestaurantSupportedLocales.SingleOrDefaultAsync(
            item => item.RestaurantId == TestDataSeeder.RestaurantAId && item.LocaleCode == localeCode);

        if (locale is null)
        {
            context.RestaurantSupportedLocales.Add(new RestaurantSupportedLocale
            {
                RestaurantId = TestDataSeeder.RestaurantAId,
                LocaleCode = localeCode,
                IsEnabled = isEnabled,
                SortOrder = sortOrder,
                CreatedAt = DateTime.UtcNow
            });
            return;
        }

        locale.IsEnabled = isEnabled;
        locale.SortOrder = sortOrder;
    }

    private static void UpsertCategoryTranslation(
        ApplicationDbContext context,
        Category category,
        string localeCode,
        string? publishedName,
        int publishedSourceVersion,
        string? draftName,
        DateTime now)
    {
        var translation = context.CategoryTranslations
            .SingleOrDefault(item => item.CategoryId == category.Id && item.LocaleCode == localeCode);

        if (translation is null)
        {
            translation = new CategoryTranslation
            {
                CategoryId = category.Id,
                LocaleCode = localeCode,
                CreatedAt = now
            };
            context.CategoryTranslations.Add(translation);
        }

        translation.Name = publishedName;
        translation.PublishedSource = publishedName is null ? null : TranslationSource.Machine;
        translation.PublishedSourceVersion = publishedName is null ? null : publishedSourceVersion;
        translation.DraftName = draftName;
        translation.DraftStatus = draftName is null ? null : TranslationStatus.NeedsReview;
    }

    private static void UpsertMenuItemTranslation(
        ApplicationDbContext context,
        MenuItem menuItem,
        string localeCode,
        string? publishedName,
        int publishedSourceVersion,
        string? draftName,
        DateTime now)
    {
        var translation = context.MenuItemTranslations
            .SingleOrDefault(item => item.MenuItemId == menuItem.Id && item.LocaleCode == localeCode);

        if (translation is null)
        {
            translation = new MenuItemTranslation
            {
                MenuItemId = menuItem.Id,
                LocaleCode = localeCode,
                CreatedAt = now
            };
            context.MenuItemTranslations.Add(translation);
        }

        translation.Name = publishedName;
        translation.PublishedSource = publishedName is null ? null : TranslationSource.Machine;
        translation.PublishedSourceVersion = publishedName is null ? null : publishedSourceVersion;
        translation.DraftName = draftName;
        translation.DraftStatus = draftName is null ? null : TranslationStatus.NeedsReview;
    }

    private async Task<HttpClient> CreateAuthenticatedOwnerClientAsync()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

        var loginResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { Email = TestDataSeeder.OwnerAEmail, Password = TestDataSeeder.CorrectPassword });
        loginResponse.EnsureSuccessStatusCode();

        var payload = await loginResponse.Content.ReadFromJsonAsync<LoginResponseModel>(JsonOptions);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", payload!.AccessToken);

        return client;
    }

    private sealed class LoginResponseModel
    {
        public string AccessToken { get; init; } = string.Empty;
    }

    private sealed class AdminCategoryResponse
    {
        public Guid Id { get; init; }
        public string NameAr { get; init; } = string.Empty;
        public string? NameEn { get; init; }
        public string? PrimaryName { get; init; }
        public string? PrimaryLocale { get; init; }
        public bool PrimaryFallbackApplied { get; init; }
    }

    private sealed class AdminMenuItemResponse
    {
        public Guid Id { get; init; }
        public string NameAr { get; init; } = string.Empty;
        public string? NameEn { get; init; }
        public string? PrimaryName { get; init; }
        public string? PrimaryLocale { get; init; }
        public bool PrimaryFallbackApplied { get; init; }
    }
}

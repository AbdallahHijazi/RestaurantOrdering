using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class PublicMenuLocaleResolutionTests : IClassFixture<TestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public PublicMenuLocaleResolutionTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task WithoutLang_UsesDefaultLocaleMetadata()
    {
        await SeedScenarioAsync();

        using var client = _factory.CreateClient();
        var menu = await client.GetFromJsonAsync<PublicMenuResponse>(
            "/api/v1/public/restaurants/restaurant-a/menu",
            JsonOptions);

        menu.Should().NotBeNull();
        menu!.RequestedLocale.Should().BeNull();
        menu.ResolvedLocale.Should().Be("ar");
        menu.FallbackApplied.Should().BeFalse();
        menu.Direction.Should().Be("rtl");
        menu.Name.Should().Be("مطعم أ");
        menu.NameAr.Should().Be("مطعم أ");
    }

    [Fact]
    public async Task LangAr_ReturnsArabicWithRtlDirection()
    {
        await SeedScenarioAsync();

        using var client = _factory.CreateClient();
        var menu = await GetMenuAsync(client, "ar");

        menu.RequestedLocale.Should().Be("ar");
        menu.ResolvedLocale.Should().Be("ar");
        menu.Direction.Should().Be("rtl");
        menu.Name.Should().Be("مطعم أ");
    }

    [Fact]
    public async Task LangEn_ReturnsEnglishWithLtrDirection()
    {
        await SeedScenarioAsync();

        using var client = _factory.CreateClient();
        var menu = await GetMenuAsync(client, "en");

        menu.RequestedLocale.Should().Be("en");
        menu.ResolvedLocale.Should().Be("en");
        menu.Direction.Should().Be("ltr");
        menu.Name.Should().Be("Restaurant A");
    }

    [Fact]
    public async Task LangFr_WithApprovedPublishedTranslations_ReturnsFrenchWithLtrDirection()
    {
        await SeedScenarioAsync(includeFrench: true);

        using var client = _factory.CreateClient();
        var menu = await GetMenuAsync(client, "fr");

        menu.RequestedLocale.Should().Be("fr");
        menu.ResolvedLocale.Should().Be("fr");
        menu.FallbackApplied.Should().BeFalse();
        menu.Direction.Should().Be("ltr");
        menu.Name.Should().Be("Restaurant FR");
        menu.Categories.Single().Name.Should().Be("Category FR");
        menu.Categories.Single().Items.Single().Name.Should().Be("Item FR");
    }

    [Fact]
    public async Task LangDe_WithApprovedPublishedTranslations_ReturnsGermanWithLtrDirection()
    {
        await SeedScenarioAsync(includeGerman: true);

        using var client = _factory.CreateClient();
        var menu = await GetMenuAsync(client, "de");

        menu.RequestedLocale.Should().Be("de");
        menu.ResolvedLocale.Should().Be("de");
        menu.Direction.Should().Be("ltr");
        menu.Name.Should().Be("Restaurant DE");
    }

    [Fact]
    public async Task LangXyz_FallsBackToDefaultLocale()
    {
        await SeedScenarioAsync();

        using var client = _factory.CreateClient();
        var menu = await GetMenuAsync(client, "xyz");

        menu.RequestedLocale.Should().Be("xyz");
        menu.ResolvedLocale.Should().Be("ar");
        menu.FallbackApplied.Should().BeTrue();
        menu.Name.Should().Be("مطعم أ");
    }

    [Fact]
    public async Task DisabledRestaurantLocale_FallsBackToDefaultLocale()
    {
        await SeedScenarioAsync(includeFrench: true, frenchEnabled: false);

        using var client = _factory.CreateClient();
        var menu = await GetMenuAsync(client, "fr");

        menu.RequestedLocale.Should().Be("fr");
        menu.ResolvedLocale.Should().Be("ar");
        menu.FallbackApplied.Should().BeTrue();
        menu.Name.Should().Be("مطعم أ");
    }

    [Fact]
    public async Task DraftOnlyFrench_DoesNotSurfacePublishedContent()
    {
        await SeedScenarioAsync(includeFrench: true, frenchPublished: false, frenchDraftOnly: true);

        using var client = _factory.CreateClient();
        var menu = await GetMenuAsync(client, "fr");

        menu.Name.Should().Be("مطعم أ");
        menu.Name.Should().NotContain("Draft FR");
        menu.FallbackApplied.Should().BeFalse();
        menu.Categories.Single().Name.Should().Be("فئة اختبار");
    }

    [Fact]
    public async Task PublishedAndDraftFrench_UsesPublishedOnly()
    {
        await SeedScenarioAsync(includeFrench: true, frenchDraftName: "Draft FR Should Not Show");

        using var client = _factory.CreateClient();
        var menu = await GetMenuAsync(client, "fr");

        menu.Name.Should().Be("Restaurant FR");
        menu.Name.Should().NotContain("Draft FR");
    }

    [Fact]
    public async Task StaleFrenchTranslation_IsIgnored()
    {
        await SeedScenarioAsync(includeFrench: true, frenchPublishedSourceVersion: 99);

        using var client = _factory.CreateClient();
        var menu = await GetMenuAsync(client, "fr");

        menu.Name.Should().Be("مطعم أ");
        menu.Categories.Single().FallbackApplied.Should().BeTrue();
    }

    [Fact]
    public async Task CategoryMissingFrench_UsesFallbackForCategoryOnly()
    {
        await SeedScenarioAsync(includeFrench: true, frenchCategoryPublished: false);

        using var client = _factory.CreateClient();
        var menu = await GetMenuAsync(client, "fr");

        menu.Name.Should().Be("Restaurant FR");
        menu.Categories.Single().Name.Should().Be("فئة اختبار");
        menu.Categories.Single().ResolvedLocale.Should().Be("ar");
        menu.Categories.Single().FallbackApplied.Should().BeTrue();
    }

    [Fact]
    public async Task MenuItemMissingFrench_UsesFallbackForItemOnly()
    {
        await SeedScenarioAsync(includeFrench: true, frenchMenuItemPublished: false);

        using var client = _factory.CreateClient();
        var menu = await GetMenuAsync(client, "fr");

        menu.Name.Should().Be("Restaurant FR");
        menu.Categories.Single().Items.Single().Name.Should().Be("صنف اختبار");
        menu.Categories.Single().Items.Single().ResolvedLocale.Should().Be("ar");
        menu.Categories.Single().Items.Single().FallbackApplied.Should().BeTrue();
    }

    [Fact]
    public async Task RestaurantMissingFrench_UsesFallbackForRestaurant()
    {
        await SeedScenarioAsync(includeFrench: true, frenchRestaurantPublished: false);

        using var client = _factory.CreateClient();
        var menu = await GetMenuAsync(client, "fr");

        menu.Name.Should().Be("مطعم أ");
        menu.ResolvedLocale.Should().Be("fr");
        menu.FallbackApplied.Should().BeFalse();
    }

    [Fact]
    public async Task ResolvedNames_AreNeverEmpty()
    {
        await SeedScenarioAsync(includeFrench: true);

        using var client = _factory.CreateClient();
        var menu = await GetMenuAsync(client, "fr");

        menu.Name.Should().NotBeNullOrWhiteSpace();
        menu.Categories.Should().OnlyContain(category => !string.IsNullOrWhiteSpace(category.Name));
        menu.Categories.SelectMany(category => category.Items)
            .Should()
            .OnlyContain(item => !string.IsNullOrWhiteSpace(item.Name));
    }

    [Fact]
    public async Task Direction_ComesFromLocaleMetadata_NotHardcodedArabicCheck()
    {
        await SeedScenarioAsync(includeFrench: true);

        using var client = _factory.CreateClient();
        var frenchMenu = await GetMenuAsync(client, "fr");
        var arabicMenu = await GetMenuAsync(client, "ar");

        frenchMenu.Direction.Should().Be("ltr");
        arabicMenu.Direction.Should().Be("rtl");
    }

    [Fact]
    public async Task ResponseMetadata_IsPresentAndCorrect()
    {
        await SeedScenarioAsync(includeFrench: true, frenchEnabled: false);

        using var client = _factory.CreateClient();
        var body = await client.GetStringAsync("/api/v1/public/restaurants/restaurant-a/menu?lang=fr");

        body.Should().Contain("\"requestedLocale\":\"fr\"");
        body.Should().Contain("\"resolvedLocale\":\"ar\"");
        body.Should().Contain("\"fallbackApplied\":true");
        body.Should().Contain("\"direction\":\"rtl\"");
        body.Should().NotContain("\"direction\":1");
        body.Should().NotContain("\"direction\":2");
    }

    [Fact]
    public async Task LegacyPublicMenuWithoutLang_StillReturns200WithLegacyFields()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/public/restaurants/restaurant-a/menu");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var menu = await response.Content.ReadFromJsonAsync<PublicMenuResponse>(JsonOptions);
        menu!.NameAr.Should().Be("مطعم أ");
        menu.NameEn.Should().Be("Restaurant A");
    }

    [Fact]
    public void FrontendWasNotModifiedForPublicMenuLocaleResolution()
    {
        var frontendMenuApiPath = Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "..", "..", "..", "..", "..",
            "frontend", "restaurant-ordering-web", "src", "app", "features", "public-menu", "data-access", "public-menu-api.ts"));

        var content = File.ReadAllText(frontendMenuApiPath);
        content.Should().NotContain("lang=");
        content.Should().NotContain("requestedLocale");
    }

    private async Task SeedScenarioAsync(
        bool includeFrench = false,
        bool includeGerman = false,
        bool frenchEnabled = true,
        bool frenchPublished = true,
        bool frenchRestaurantPublished = true,
        bool frenchCategoryPublished = true,
        bool frenchMenuItemPublished = true,
        bool frenchDraftOnly = false,
        string? frenchDraftName = null,
        int? frenchPublishedSourceVersion = null)
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var settings = await context.RestaurantSettings.SingleAsync(item => item.RestaurantId == TestDataSeeder.RestaurantAId);
        settings.DefaultLocale = "ar";
        settings.TranslationMode = TranslationMode.AutoGenerateDrafts;

        await EnsureSupportedLocaleAsync(context, "ar", 1);
        await EnsureSupportedLocaleAsync(context, "en", 2);

        if (includeFrench)
        {
            await EnsureSupportedLocaleAsync(context, "fr", 3, frenchEnabled);
        }

        if (includeGerman)
        {
            await EnsureSupportedLocaleAsync(context, "de", 4);
        }

        var restaurant = await context.Restaurants.SingleAsync(item => item.Id == TestDataSeeder.RestaurantAId);
        var category = await context.Categories.SingleAsync(item => item.Id == TestDataSeeder.CategoryAId);
        var menuItem = await context.MenuItems.SingleAsync(item => item.Id == TestDataSeeder.MenuItemAId);
        var now = DateTime.UtcNow;

        if (includeFrench)
        {
            UpsertRestaurantTranslation(
                context,
                restaurant.Id,
                "fr",
                frenchPublished && frenchRestaurantPublished ? "Restaurant FR" : null,
                frenchPublishedSourceVersion ?? restaurant.ContentVersion,
                draftName: frenchDraftOnly ? "Draft FR Restaurant" : frenchDraftName,
                now);

            UpsertCategoryTranslation(
                context,
                category,
                "fr",
                frenchPublished && frenchCategoryPublished ? "Category FR" : null,
                frenchPublishedSourceVersion ?? category.ContentVersion,
                draftName: frenchDraftOnly ? "Draft FR Category" : null,
                now);

            UpsertMenuItemTranslation(
                context,
                menuItem,
                "fr",
                frenchPublished && frenchMenuItemPublished ? "Item FR" : null,
                frenchPublishedSourceVersion ?? menuItem.ContentVersion,
                draftName: frenchDraftOnly ? "Draft FR Item" : null,
                now);
        }

        if (includeGerman)
        {
            UpsertRestaurantTranslation(context, restaurant.Id, "de", "Restaurant DE", restaurant.ContentVersion, null, now);
            UpsertCategoryTranslation(context, category, "de", "Category DE", category.ContentVersion, null, now);
            UpsertMenuItemTranslation(context, menuItem, "de", "Item DE", menuItem.ContentVersion, null, now);
        }

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

    private static void UpsertRestaurantTranslation(
        ApplicationDbContext context,
        Guid restaurantId,
        string localeCode,
        string? publishedName,
        int publishedSourceVersion,
        string? draftName,
        DateTime now)
    {
        var translation = context.RestaurantTranslations
            .SingleOrDefault(item => item.RestaurantId == restaurantId && item.LocaleCode == localeCode);

        if (translation is null)
        {
            translation = new RestaurantTranslation
            {
                RestaurantId = restaurantId,
                LocaleCode = localeCode,
                CreatedAt = now
            };
            context.RestaurantTranslations.Add(translation);
        }

        translation.Name = publishedName;
        translation.PublishedSource = publishedName is null ? null : TranslationSource.Machine;
        translation.PublishedSourceVersion = publishedName is null ? null : publishedSourceVersion;
        translation.DraftName = draftName;
        translation.DraftStatus = draftName is null ? null : TranslationStatus.NeedsReview;
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

    private static async Task<PublicMenuResponse> GetMenuAsync(HttpClient client, string lang) =>
        (await client.GetFromJsonAsync<PublicMenuResponse>(
            $"/api/v1/public/restaurants/restaurant-a/menu?lang={Uri.EscapeDataString(lang)}",
            JsonOptions))!;

    private sealed class PublicMenuResponse
    {
        public string? RequestedLocale { get; init; }
        public string ResolvedLocale { get; init; } = string.Empty;
        public bool FallbackApplied { get; init; }
        public string Direction { get; init; } = string.Empty;
        public string Name { get; init; } = string.Empty;
        public string NameAr { get; init; } = string.Empty;
        public string? NameEn { get; init; }
        public List<PublicMenuCategoryResponse> Categories { get; init; } = [];
    }

    private sealed class PublicMenuCategoryResponse
    {
        public string Name { get; init; } = string.Empty;
        public string ResolvedLocale { get; init; } = string.Empty;
        public bool FallbackApplied { get; init; }
        public List<PublicMenuItemResponse> Items { get; init; } = [];
    }

    private sealed class PublicMenuItemResponse
    {
        public string Name { get; init; } = string.Empty;
        public string ResolvedLocale { get; init; } = string.Empty;
        public bool FallbackApplied { get; init; }
    }
}

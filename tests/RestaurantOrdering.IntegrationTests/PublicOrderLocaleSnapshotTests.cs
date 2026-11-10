using System.Net;
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

[Collection("CreatePublicOrderFlow")]
public sealed class PublicOrderLocaleSnapshotTests
{
    private static readonly Guid SecondMenuItemId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02");

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public PublicOrderLocaleSnapshotTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CreateOrder_WithoutLocale_UsesDefaultLocaleSnapshot()
    {
        await SeedScenarioAsync();

        using var client = CreateHttpsClient();
        var response = await PostPickupOrderAsync(client, locale: null);
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var order = await LoadLatestOrderAsync();
        order.RequestedLocale.Should().BeNull();
        order.ResolvedLocale.Should().Be("ar");
        order.FallbackApplied.Should().BeFalse();
        order.OrderItems.Single().DisplayedLocale.Should().Be("ar");
        order.OrderItems.Single().DisplayedItemName.Should().Be("صنف اختبار");
    }

    [Fact]
    public async Task CreateOrder_WithFrenchPublishedItem_StoresFrenchDisplayedLocale()
    {
        await SeedScenarioAsync(includeFrench: true, frenchItemPublished: true);

        using var client = CreateHttpsClient();
        var response = await PostPickupOrderAsync(client, locale: "fr");
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var order = await LoadLatestOrderAsync();
        order.RequestedLocale.Should().Be("fr");
        order.ResolvedLocale.Should().Be("fr");
        order.FallbackApplied.Should().BeFalse();
        order.OrderItems.Single().DisplayedLocale.Should().Be("fr");
        order.OrderItems.Single().DisplayedItemName.Should().Be("Item FR");
    }

    [Fact]
    public async Task CreateOrder_WithFrenchLocaleWithoutItemTranslation_FallsBackToDefault()
    {
        await SeedScenarioAsync(includeFrench: true, frenchItemPublished: false);

        using var client = CreateHttpsClient();
        var response = await PostPickupOrderAsync(client, locale: "fr");
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var order = await LoadLatestOrderAsync();
        order.ResolvedLocale.Should().Be("fr");
        order.OrderItems.Single().DisplayedLocale.Should().Be("ar");
        order.OrderItems.Single().DisplayedItemName.Should().Be("صنف اختبار");
    }

    [Fact]
    public async Task CreateOrder_WithUnknownLocale_FallsBackToDefaultLocale()
    {
        await SeedScenarioAsync(includeFrench: true);

        using var client = CreateHttpsClient();
        var response = await PostPickupOrderAsync(client, locale: "xyz");
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var order = await LoadLatestOrderAsync();
        order.RequestedLocale.Should().Be("xyz");
        order.ResolvedLocale.Should().Be("ar");
        order.FallbackApplied.Should().BeTrue();
    }

    [Fact]
    public async Task CreateOrder_DraftOnlyFrenchTranslation_IsNotUsed()
    {
        await SeedScenarioAsync(includeFrench: true, frenchDraftOnly: true);

        using var client = CreateHttpsClient();
        var response = await PostPickupOrderAsync(client, locale: "fr");
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var order = await LoadLatestOrderAsync();
        order.OrderItems.Single().DisplayedItemName.Should().Be("صنف اختبار");
        order.OrderItems.Single().DisplayedItemName.Should().NotContain("Draft FR");
    }

    [Fact]
    public async Task CreateOrder_StaleFrenchTranslation_IsNotUsed()
    {
        await SeedScenarioAsync(includeFrench: true, frenchItemPublishedSourceVersion: 99);

        using var client = CreateHttpsClient();
        var response = await PostPickupOrderAsync(client, locale: "fr");
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var order = await LoadLatestOrderAsync();
        order.OrderItems.Single().DisplayedItemName.Should().Be("صنف اختبار");
        order.OrderItems.Single().DisplayedLocale.Should().Be("ar");
    }

    [Fact]
    public async Task CreateOrder_DisplayedItemName_IsResolvedFromDatabase_NotClientPayload()
    {
        await SeedScenarioAsync(includeFrench: true, frenchItemPublished: true);

        using var client = CreateHttpsClient();
        var response = await client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Snapshot Guest",
                GuestPhone = "+15550101010",
                OrderType = OrderType.Pickup,
                Locale = "fr",
                Items = new[]
                {
                    new
                    {
                        MenuItemId = TestDataSeeder.MenuItemAId,
                        Quantity = 1,
                        DisplayedItemName = "Client Forged Name"
                    }
                }
            });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var order = await LoadLatestOrderAsync();
        order.OrderItems.Single().DisplayedItemName.Should().Be("Item FR");
        order.OrderItems.Single().DisplayedItemName.Should().NotBe("Client Forged Name");
    }

    [Fact]
    public async Task CreateOrder_LegacyItemNameFields_AreStillPersisted()
    {
        await SeedScenarioAsync(includeFrench: true, frenchItemPublished: true);

        using var client = CreateHttpsClient();
        var response = await PostPickupOrderAsync(client, locale: "fr");
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var order = await LoadLatestOrderAsync();
        var line = order.OrderItems.Single();
        line.ItemNameAr.Should().Be("صنف اختبار");
        line.ItemNameEn.Should().Be("Test Item");
        line.DisplayedItemName.Should().Be("Item FR");
    }

    [Fact]
    public async Task CreateOrder_SnapshotDoesNotChange_WhenMenuItemTranslationIsUpdatedLater()
    {
        await SeedScenarioAsync(includeFrench: true, frenchItemPublished: true);

        using var client = CreateHttpsClient();
        var response = await PostPickupOrderAsync(client, locale: "fr");
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var orderId = (await LoadLatestOrderAsync()).Id;

        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var translation = await context.MenuItemTranslations.SingleAsync(
                item => item.MenuItemId == TestDataSeeder.MenuItemAId && item.LocaleCode == "fr");
            translation.Name = "Updated FR Name";
            translation.PublishedSourceVersion = translation.PublishedSourceVersion;
            await context.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var line = await context.OrderItems.AsNoTracking().SingleAsync(item => item.OrderId == orderId);
            line.DisplayedItemName.Should().Be("Item FR");
            line.DisplayedLocale.Should().Be("fr");
        }
    }

    [Fact]
    public async Task CreateOrder_MultipleItems_CanHaveDifferentDisplayedLocales()
    {
        await SeedScenarioAsync(includeFrench: true, frenchItemPublished: true, seedSecondMenuItem: true, secondItemFrenchPublished: false);

        using var client = CreateHttpsClient();
        var response = await client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Mixed Guest",
                GuestPhone = "+15550101010",
                OrderType = OrderType.Pickup,
                Locale = "fr",
                Items = new[]
                {
                    new { MenuItemId = TestDataSeeder.MenuItemAId, Quantity = 1 },
                    new { MenuItemId = SecondMenuItemId, Quantity = 1 }
                }
            });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var order = await LoadLatestOrderAsync();
        var first = order.OrderItems.Single(item => item.MenuItemId == TestDataSeeder.MenuItemAId);
        var second = order.OrderItems.Single(item => item.MenuItemId == SecondMenuItemId);

        first.DisplayedLocale.Should().Be("fr");
        first.DisplayedItemName.Should().Be("Item FR");
        second.DisplayedLocale.Should().Be("ar");
        second.DisplayedItemName.Should().Be("صنف ثاني");
        second.DisplayedLocale.Should().NotBe(first.DisplayedLocale);
    }

    [Fact]
    public void AddOrderLocaleSnapshotMigration_IsAdditiveOnly()
    {
        var migrationPath = Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "..", "..", "..", "..", "..",
            "src", "RestaurantOrdering.Infrastructure", "Persistence", "Migrations",
            "20260613191759_AddOrderLocaleSnapshot.cs"));

        var content = File.ReadAllText(migrationPath);
        var upMigration = content.Split("protected override void Down", StringSplitOptions.None)[0];
        upMigration.Should().Contain("AddColumn");
        upMigration.Should().NotContain("DropColumn", "Up migration must remain additive");
        upMigration.Should().NotContain("DropTable");
    }

    [Fact]
    public async Task CreateOrder_WithoutLocale_RemainsCompatibleWithExistingClients()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using var client = CreateHttpsClient();
        var response = await client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Legacy Guest",
                GuestPhone = "+15550101010",
                OrderType = OrderType.Pickup,
                Items = new[] { new { MenuItemId = TestDataSeeder.MenuItemAId, Quantity = 1 } }
            });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    private async Task SeedScenarioAsync(
        bool includeFrench = false,
        bool frenchItemPublished = true,
        bool frenchDraftOnly = false,
        int? frenchItemPublishedSourceVersion = null,
        bool seedSecondMenuItem = false,
        bool secondItemFrenchPublished = false)
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var settings = await context.RestaurantSettings.SingleAsync(item => item.RestaurantId == TestDataSeeder.RestaurantAId);
        settings.DefaultLocale = "ar";

        await EnsureSupportedLocaleAsync(context, "ar", 1);
        await EnsureSupportedLocaleAsync(context, "en", 2);

        if (includeFrench)
        {
            await EnsureSupportedLocaleAsync(context, "fr", 3);
        }

        var menuItem = await context.MenuItems.SingleAsync(item => item.Id == TestDataSeeder.MenuItemAId);

        if (includeFrench)
        {
            UpsertMenuItemTranslation(
                context,
                menuItem,
                "fr",
                frenchItemPublished && !frenchDraftOnly ? "Item FR" : null,
                frenchItemPublishedSourceVersion ?? menuItem.ContentVersion,
                draftName: frenchDraftOnly ? "Draft FR Item" : null);
        }

        if (seedSecondMenuItem)
        {
            if (!await context.MenuItems.AnyAsync(item => item.Id == SecondMenuItemId))
            {
                context.MenuItems.Add(new MenuItem
                {
                    Id = SecondMenuItemId,
                    RestaurantId = TestDataSeeder.RestaurantAId,
                    CategoryId = TestDataSeeder.CategoryAId,
                    NameAr = "صنف ثاني",
                    NameEn = "Second Item",
                    Price = 15m,
                    DisplayOrder = 2,
                    IsAvailable = true,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedAt = DateTime.UtcNow
                });
                await context.SaveChangesAsync();
            }

            var secondItem = await context.MenuItems.SingleAsync(item => item.Id == SecondMenuItemId);
            if (includeFrench)
            {
                UpsertMenuItemTranslation(
                    context,
                    secondItem,
                    "fr",
                    secondItemFrenchPublished ? "Second Item FR" : null,
                    secondItem.ContentVersion,
                    draftName: null);
            }
        }

        await context.SaveChangesAsync();
    }

    private static async Task EnsureSupportedLocaleAsync(
        ApplicationDbContext context,
        string localeCode,
        int sortOrder)
    {
        var locale = await context.RestaurantSupportedLocales.SingleOrDefaultAsync(
            item => item.RestaurantId == TestDataSeeder.RestaurantAId && item.LocaleCode == localeCode);

        if (locale is null)
        {
            context.RestaurantSupportedLocales.Add(new RestaurantSupportedLocale
            {
                RestaurantId = TestDataSeeder.RestaurantAId,
                LocaleCode = localeCode,
                IsEnabled = true,
                SortOrder = sortOrder,
                CreatedAt = DateTime.UtcNow
            });
            return;
        }

        locale.IsEnabled = true;
        locale.SortOrder = sortOrder;
    }

    private static void UpsertMenuItemTranslation(
        ApplicationDbContext context,
        MenuItem menuItem,
        string localeCode,
        string? publishedName,
        int publishedSourceVersion,
        string? draftName)
    {
        var translation = context.MenuItemTranslations.SingleOrDefault(
            item => item.MenuItemId == menuItem.Id && item.LocaleCode == localeCode);

        if (translation is null)
        {
            translation = new MenuItemTranslation
            {
                MenuItemId = menuItem.Id,
                LocaleCode = localeCode,
                CreatedAt = DateTime.UtcNow
            };
            context.MenuItemTranslations.Add(translation);
        }

        translation.Name = publishedName;
        translation.PublishedSource = publishedName is null ? null : TranslationSource.Machine;
        translation.PublishedSourceVersion = publishedName is null ? null : publishedSourceVersion;
        translation.DraftName = draftName;
        translation.DraftStatus = draftName is null ? null : TranslationStatus.NeedsReview;
    }

    private async Task<Order> LoadLatestOrderAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await context.Orders
            .AsNoTracking()
            .Include(item => item.OrderItems)
            .Where(item => item.RestaurantId == TestDataSeeder.RestaurantAId)
            .OrderByDescending(item => item.CreatedAt)
            .FirstAsync();
    }

    private static string OrdersUrl(string slug) => $"/api/v1/public/restaurants/{slug}/orders";

    private static Task<HttpResponseMessage> PostPickupOrderAsync(HttpClient client, string? locale) =>
        client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Pickup Guest",
                GuestPhone = "+15550101010",
                OrderType = OrderType.Pickup,
                Locale = locale,
                Items = new[] { new { MenuItemId = TestDataSeeder.MenuItemAId, Quantity = 1 } }
            });

    private static HttpClient CreateHttpsClient(WebApplicationFactory<Program> factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

    private HttpClient CreateHttpsClient() => CreateHttpsClient(_factory);
}

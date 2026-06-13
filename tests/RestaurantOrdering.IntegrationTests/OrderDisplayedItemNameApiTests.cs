using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RestaurantOrdering.Application.Features.Orders.DTOs;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

[Collection("CreatePublicOrderFlow")]
public sealed class OrderDisplayedItemNameApiTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public OrderDisplayedItemNameApiTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CreateOrder_ConfirmationDto_ReturnsDisplayedItemNameAndLegacyFields()
    {
        await SeedFrenchScenarioAsync();

        using var client = CreateHttpsClient();
        var response = await client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "French Guest",
                GuestPhone = "+15550101010",
                OrderType = OrderType.Pickup,
                Locale = "fr",
                Items = new[] { new { MenuItemId = TestDataSeeder.MenuItemAId, Quantity = 1 } }
            });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var confirmation = await response.Content.ReadFromJsonAsync<PublicOrderConfirmationDto>(JsonOptions);
        confirmation.Should().NotBeNull();

        var line = confirmation!.Items.Single();
        line.DisplayedItemName.Should().Be("Item FR");
        line.DisplayedLocale.Should().Be("fr");
        line.ItemNameAr.Should().Be("صنف اختبار");
        line.ItemNameEn.Should().Be("Test Item");
    }

    [Fact]
    public async Task GetOrderById_ReturnsDisplayedItemNameForFrenchOrder()
    {
        await SeedFrenchScenarioAsync();

        using var publicClient = CreateHttpsClient();
        var createResponse = await publicClient.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "French Guest",
                GuestPhone = "+15550101010",
                OrderType = OrderType.Pickup,
                Locale = "fr",
                Items = new[] { new { MenuItemId = TestDataSeeder.MenuItemAId, Quantity = 1 } }
            });
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var confirmation = await createResponse.Content.ReadFromJsonAsync<PublicOrderConfirmationDto>(JsonOptions);

        using var adminClient = CreateHttpsClient();
        await AuthenticateAsync(adminClient, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var detailsResponse = await adminClient.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/orders/{confirmation!.OrderId}");

        detailsResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var details = await detailsResponse.Content.ReadFromJsonAsync<OrderDetailsDto>(JsonOptions);
        var line = details!.Items.Single();

        line.DisplayedItemName.Should().Be("Item FR");
        line.DisplayedLocale.Should().Be("fr");
        line.ItemNameAr.Should().Be("صنف اختبار");
        line.ItemNameEn.Should().Be("Test Item");
    }

    [Fact]
    public async Task GetOrderById_LegacySeededOrder_FallsBackToItemNameArWhenDisplayedNameEmpty()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/orders/{TestDataSeeder.OrderAId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var details = await response.Content.ReadFromJsonAsync<OrderDetailsDto>(JsonOptions);
        var line = details!.Items.Single();

        line.DisplayedItemName.Should().Be("صنف اختبار");
        line.DisplayedLocale.Should().Be("ar");
        line.ItemNameAr.Should().Be("صنف اختبار");
        line.ItemNameEn.Should().Be("Test Item");
    }

    private async Task SeedFrenchScenarioAsync()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var settings = await context.RestaurantSettings.SingleAsync(item => item.RestaurantId == TestDataSeeder.RestaurantAId);
        settings.DefaultLocale = "ar";

        await EnsureSupportedLocaleAsync(context, "ar", 1);
        await EnsureSupportedLocaleAsync(context, "en", 2);
        await EnsureSupportedLocaleAsync(context, "fr", 3);

        var menuItem = await context.MenuItems.SingleAsync(item => item.Id == TestDataSeeder.MenuItemAId);
        UpsertMenuItemTranslation(context, menuItem, "fr", "Item FR", menuItem.ContentVersion);

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
        string publishedName,
        int publishedSourceVersion)
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
        translation.PublishedSource = TranslationSource.Machine;
        translation.PublishedSourceVersion = publishedSourceVersion;
    }

    private static string OrdersUrl(string slug) => $"/api/v1/public/restaurants/{slug}/orders";

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

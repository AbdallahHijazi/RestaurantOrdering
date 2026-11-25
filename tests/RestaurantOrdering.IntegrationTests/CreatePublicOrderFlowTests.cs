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
public sealed class CreatePublicOrderFlowTests
{
    private static readonly Guid MenuItemRestaurantBId = Guid.Parse("bbbbbbbb-7777-7777-7777-777777777777");
    private static readonly Guid InactiveMenuItemId = Guid.Parse("aaaaaaaa-dddd-dddd-dddd-dddddddddd02");
    private static readonly Guid UnavailableMenuItemId = Guid.Parse("aaaaaaaa-dddd-dddd-dddd-dddddddddd01");
    private static readonly Guid DeletedMenuItemId = Guid.Parse("aaaaaaaa-eeee-eeee-eeee-eeeeeeeeee01");
    private static readonly Guid DiscountMenuItemId = Guid.Parse("aaaaaaaa-ffff-ffff-ffff-fffffffffff1");

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public CreatePublicOrderFlowTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CreatePublicOrder_Pickup_Returns201()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await PostPickupOrderAsync(client, quantity: 1);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Pickup_DeliveryFee_IsZero()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await PostPickupOrderAsync(client, quantity: 1);
        var confirmation = await ReadConfirmationAsync(response);

        confirmation.DeliveryFee.Should().Be(0m);
        confirmation.OrderType.Should().Be(OrderType.Pickup);
    }

    [Fact]
    public async Task Pickup_Total_IsCalculatedByBackend()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        const int quantity = 2;
        const decimal unitPrice = 25m;
        const decimal expectedSubtotal = unitPrice * quantity;
        var expectedTax = Math.Round(expectedSubtotal * 0.15m, 2, MidpointRounding.AwayFromZero);
        var expectedTotal = expectedSubtotal + expectedTax;

        var response = await PostPickupOrderAsync(client, quantity);
        var confirmation = await ReadConfirmationAsync(response);

        confirmation.Subtotal.Should().Be(expectedSubtotal);
        confirmation.TaxAmount.Should().Be(expectedTax);
        confirmation.DeliveryFee.Should().Be(0m);
        confirmation.DiscountAmount.Should().Be(0m);
        confirmation.TotalAmount.Should().Be(expectedTotal);
    }

    [Fact]
    public async Task Pickup_DoesNotRequireDeliveryAddress()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Pickup Guest",
                GuestPhone = "+15550001111",
                OrderType = OrderType.Pickup,
                DeliveryAddress = (string?)null,
                Items = new[] { CreateItem(TestDataSeeder.MenuItemAId, 1) }
            });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Pickup_WhenDisabled_Returns409()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await UpdateRestaurantASettingsAsync(settings =>
        {
            settings.IsPickupEnabled = false;
            settings.IsDeliveryEnabled = true;
        });

        using var client = CreateHttpsClient();
        var response = await PostPickupOrderAsync(client, quantity: 1);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task CreatePublicOrder_DeliveryWithAddress_Returns201()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await PostDeliveryOrderAsync(
            client,
            deliveryAddress: "123 Test Street",
            quantity: 1);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Delivery_UsesConfiguredDeliveryFee()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        const decimal configuredFee = 12.50m;
        await UpdateRestaurantASettingsAsync(settings => settings.DeliveryFee = configuredFee);

        using var client = CreateHttpsClient();
        var response = await PostDeliveryOrderAsync(client, "Delivery Street 1", quantity: 1);
        var confirmation = await ReadConfirmationAsync(response);

        confirmation.DeliveryFee.Should().Be(configuredFee);
    }

    [Fact]
    public async Task Delivery_TotalIncludesTaxAndDeliveryFee()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        const decimal deliveryFee = 10m;
        await UpdateRestaurantASettingsAsync(settings => settings.DeliveryFee = deliveryFee);

        using var client = CreateHttpsClient();
        const int quantity = 2;
        const decimal unitPrice = 25m;
        const decimal expectedSubtotal = unitPrice * quantity;
        var expectedTax = Math.Round(expectedSubtotal * 0.15m, 2, MidpointRounding.AwayFromZero);
        var expectedTotal = expectedSubtotal + expectedTax + deliveryFee;

        var response = await PostDeliveryOrderAsync(client, "Delivery Street 2", quantity);
        var confirmation = await ReadConfirmationAsync(response);

        confirmation.Subtotal.Should().Be(expectedSubtotal);
        confirmation.TaxAmount.Should().Be(expectedTax);
        confirmation.DeliveryFee.Should().Be(deliveryFee);
        confirmation.TotalAmount.Should().Be(expectedTotal);
    }

    [Fact]
    public async Task Delivery_WithoutAddress_Returns400()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Delivery Guest",
                GuestPhone = "+15550002222",
                OrderType = OrderType.Delivery,
                DeliveryAddress = "",
                Items = new[] { CreateItem(TestDataSeeder.MenuItemAId, 1) }
            });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Delivery_WithoutPhone_Returns400()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Delivery Guest",
                GuestPhone = "",
                OrderType = OrderType.Delivery,
                DeliveryAddress = "123 Test Street",
                Items = new[] { CreateItem(TestDataSeeder.MenuItemAId, 1) }
            });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Delivery_WhenDisabled_Returns409()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await UpdateRestaurantASettingsAsync(settings =>
        {
            settings.IsDeliveryEnabled = false;
            settings.IsPickupEnabled = true;
        });

        using var client = CreateHttpsClient();
        var response = await PostDeliveryOrderAsync(client, "123 Test Street", quantity: 1);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Order_BelowMinimumAmount_Returns409()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await UpdateRestaurantASettingsAsync(settings => settings.MinimumOrderAmount = 100m);

        using var client = CreateHttpsClient();
        var response = await PostPickupOrderAsync(client, quantity: 1);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Item_FromAnotherRestaurant_Returns404()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SeedRestaurantBMenuItemAsync();

        using var client = CreateHttpsClient();
        var response = await PostPickupOrderAsync(
            client,
            quantity: 1,
            menuItemId: MenuItemRestaurantBId);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task InactiveItem_Returns404()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SeedSpecialMenuItemsAsync();

        using var client = CreateHttpsClient();
        var response = await PostPickupOrderAsync(client, 1, InactiveMenuItemId);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UnavailableItem_Returns404()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SeedSpecialMenuItemsAsync();

        using var client = CreateHttpsClient();
        var response = await PostPickupOrderAsync(client, 1, UnavailableMenuItemId);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeletedItem_Returns404()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SeedSpecialMenuItemsAsync();

        using var client = CreateHttpsClient();
        var response = await PostPickupOrderAsync(client, 1, DeletedMenuItemId);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Quantity_Zero_Returns400()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await PostPickupOrderAsync(client, quantity: 0);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Quantity_Negative_Returns400()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await PostPickupOrderAsync(client, quantity: -1);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Quantity_AboveMaximum_Returns400()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await PostPickupOrderAsync(client, quantity: 100);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task DuplicateMenuItemId_Returns400()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Duplicate Guest",
                GuestPhone = "+15550003333",
                OrderType = OrderType.Pickup,
                Items = new[]
                {
                    CreateItem(TestDataSeeder.MenuItemAId, 2),
                    CreateItem(TestDataSeeder.MenuItemAId, 3)
                }
            });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task EmptyItems_Returns400()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Empty Guest",
                GuestPhone = "+15550004444",
                OrderType = OrderType.Pickup,
                Items = Array.Empty<object>()
            });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task TooManyItemLines_Returns400()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var items = Enumerable.Range(0, 101)
            .Select(index => CreateItem(Guid.NewGuid(), 1))
            .ToArray();

        var response = await client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Too Many Lines",
                GuestPhone = "+15550005555",
                OrderType = OrderType.Pickup,
                Items = items
            });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Confirmation_ReturnsOrderNumber()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await PostPickupOrderAsync(client, quantity: 1);
        var confirmation = await ReadConfirmationAsync(response);

        confirmation.OrderNumber.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Confirmation_ReturnsNewStatus()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await PostPickupOrderAsync(client, quantity: 1);
        var confirmation = await ReadConfirmationAsync(response);

        confirmation.OrderStatus.Should().Be(OrderStatus.New);
    }

    [Fact]
    public async Task Confirmation_ReturnsSnapshotNamesAndPrices()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SeedDiscountMenuItemAsync();

        using var client = CreateHttpsClient();
        var response = await client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Snapshot Guest",
                GuestPhone = "+15550006666",
                OrderType = OrderType.Pickup,
                Items = new[] { CreateItem(DiscountMenuItemId, 2) }
            });

        var confirmation = await ReadConfirmationAsync(response);
        var line = confirmation.Items.Should().ContainSingle().Subject;

        line.ItemNameAr.Should().Be("صنف مخفض");
        line.ItemNameEn.Should().Be("Discounted Item");
        line.UnitPrice.Should().Be(18m);
        line.Quantity.Should().Be(2);
        line.TotalPrice.Should().Be(36m);
        confirmation.Subtotal.Should().Be(36m);
    }

    [Fact]
    public async Task Confirmation_DoesNotExposeSensitiveFields()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await PostPickupOrderAsync(client, quantity: 1);
        var body = await response.Content.ReadAsStringAsync();

        body.Should().NotContain("PasswordHash", because: "credentials must not leak");
        body.Should().NotContain("accessToken", because: "tokens must not leak");
        body.Should().NotContain("SigningKey", because: "secrets must not leak");
        body.Should().NotContain("StoredFileName", because: "internal file paths must not leak");
        body.Should().NotContain("FileUrl", because: "internal file paths must not leak");
    }

    [Fact]
    public async Task PublicOrder_Anonymous_IsAllowed()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await PostPickupOrderAsync(client, quantity: 1);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task PublicOrder_ExceedingRateLimit_Returns429()
    {
        using var isolatedFactory = TestWebApplicationFactory.CreateWithStrictRateLimits();
        await TestDataSeeder.SeedAsync(isolatedFactory.Services);
        using var client = CreateHttpsClient(isolatedFactory);

        HttpResponseMessage? lastResponse = null;
        for (var attempt = 0; attempt < 11; attempt++)
        {
            lastResponse = await PostPickupOrderAsync(client, quantity: 1);
        }

        lastResponse!.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    private static object CreateItem(Guid menuItemId, int quantity) =>
        new { MenuItemId = menuItemId, Quantity = quantity };

    private static string OrdersUrl(string slug) =>
        $"/api/v1/public/restaurants/{slug}/orders";

    private static Task<HttpResponseMessage> PostPickupOrderAsync(
        HttpClient client,
        int quantity,
        Guid? menuItemId = null) =>
        client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Pickup Guest",
                GuestPhone = "+15550101010",
                OrderType = OrderType.Pickup,
                Items = new[] { CreateItem(menuItemId ?? TestDataSeeder.MenuItemAId, quantity) }
            });

    private static Task<HttpResponseMessage> PostDeliveryOrderAsync(
        HttpClient client,
        string deliveryAddress,
        int quantity) =>
        client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Delivery Guest",
                GuestPhone = "+15550202020",
                OrderType = OrderType.Delivery,
                DeliveryAddress = deliveryAddress,
                Items = new[] { CreateItem(TestDataSeeder.MenuItemAId, quantity) }
            });

    private static async Task<PublicOrderConfirmationResponse> ReadConfirmationAsync(
        HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        var confirmation = await response.Content.ReadFromJsonAsync<PublicOrderConfirmationResponse>(JsonOptions);
        confirmation.Should().NotBeNull();
        return confirmation!;
    }

    private async Task UpdateRestaurantASettingsAsync(Action<RestaurantSettings> configure)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var settings = await dbContext.RestaurantSettings
            .SingleAsync(s => s.RestaurantId == TestDataSeeder.RestaurantAId);
        configure(settings);
        await dbContext.SaveChangesAsync();
    }

    private async Task SeedRestaurantBMenuItemAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        if (await dbContext.MenuItems.AnyAsync(item => item.Id == MenuItemRestaurantBId))
        {
            return;
        }

        dbContext.MenuItems.Add(new MenuItem
        {
            Id = MenuItemRestaurantBId,
            RestaurantId = TestDataSeeder.RestaurantBId,
            CategoryId = TestDataSeeder.CategoryBId,
            NameAr = "صنف ب",
            NameEn = "Restaurant B Item",
            Price = 30m,
            DisplayOrder = 1,
            IsAvailable = true,
            IsActive = true,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();
    }

    private async Task SeedSpecialMenuItemsAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var seededAt = DateTime.UtcNow;

        if (!await dbContext.MenuItems.AnyAsync(item => item.Id == UnavailableMenuItemId))
        {
            dbContext.MenuItems.Add(new MenuItem
            {
                Id = UnavailableMenuItemId,
                RestaurantId = TestDataSeeder.RestaurantAId,
                CategoryId = TestDataSeeder.CategoryAId,
                NameAr = "صنف غير متاح",
                NameEn = "Unavailable Item",
                Price = 5m,
                DisplayOrder = 99,
                IsAvailable = false,
                IsActive = true,
                IsDeleted = false,
                CreatedAt = seededAt
            });
        }

        if (!await dbContext.MenuItems.AnyAsync(item => item.Id == InactiveMenuItemId))
        {
            dbContext.MenuItems.Add(new MenuItem
            {
                Id = InactiveMenuItemId,
                RestaurantId = TestDataSeeder.RestaurantAId,
                CategoryId = TestDataSeeder.CategoryAId,
                NameAr = "صنف غير نشط",
                NameEn = "Inactive Item",
                Price = 6m,
                DisplayOrder = 100,
                IsAvailable = true,
                IsActive = false,
                IsDeleted = false,
                CreatedAt = seededAt
            });
        }

        if (!await dbContext.MenuItems.AnyAsync(item => item.Id == DeletedMenuItemId))
        {
            dbContext.MenuItems.Add(new MenuItem
            {
                Id = DeletedMenuItemId,
                RestaurantId = TestDataSeeder.RestaurantAId,
                CategoryId = TestDataSeeder.CategoryAId,
                NameAr = "صنف محذوف",
                NameEn = "Deleted Item",
                Price = 9m,
                DisplayOrder = 101,
                IsAvailable = true,
                IsActive = true,
                IsDeleted = true,
                CreatedAt = seededAt
            });
        }

        await dbContext.SaveChangesAsync();
    }

    private async Task SeedDiscountMenuItemAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        if (await dbContext.MenuItems.AnyAsync(item => item.Id == DiscountMenuItemId))
        {
            return;
        }

        dbContext.MenuItems.Add(new MenuItem
        {
            Id = DiscountMenuItemId,
            RestaurantId = TestDataSeeder.RestaurantAId,
            CategoryId = TestDataSeeder.CategoryAId,
            NameAr = "صنف مخفض",
            NameEn = "Discounted Item",
            Price = 25m,
            DiscountPrice = 18m,
            DisplayOrder = 2,
            IsAvailable = true,
            IsActive = true,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();
    }

    private static HttpClient CreateHttpsClient(WebApplicationFactory<Program> factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

    private HttpClient CreateHttpsClient() => CreateHttpsClient(_factory);

    private sealed class PublicOrderConfirmationResponse
    {
        public string OrderNumber { get; init; } = string.Empty;
        public OrderType OrderType { get; init; }
        public OrderStatus OrderStatus { get; init; }
        public decimal Subtotal { get; init; }
        public decimal DiscountAmount { get; init; }
        public decimal TaxAmount { get; init; }
        public decimal DeliveryFee { get; init; }
        public decimal TotalAmount { get; init; }
        public List<PublicOrderConfirmationItemResponse> Items { get; init; } = [];
    }

    private sealed class PublicOrderConfirmationItemResponse
    {
        public string ItemNameAr { get; init; } = string.Empty;
        public string? ItemNameEn { get; init; }
        public decimal UnitPrice { get; init; }
        public int Quantity { get; init; }
        public decimal TotalPrice { get; init; }
    }
}

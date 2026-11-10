using System.Net;
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

public sealed class RestaurantTablesFlowTests : IClassFixture<TestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public RestaurantTablesFlowTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CreateTable_GeneratesUniqueToken()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            TablesUrl(TestDataSeeder.RestaurantAId),
            new { Name = "Table 01", Zone = "Indoor", IsActive = true });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var table = await ReadTableAsync(response);

        table.PublicToken.Should().NotBeNullOrWhiteSpace();
        table.PublicToken.Length.Should().BeInRange(16, 32);
        table.Name.Should().Be("Table 01");
        table.Zone.Should().Be("Indoor");
        table.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateTable_UpdatesNameAndZone()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var created = await CreateTableAsync(client, "Table 02", "Terrace");

        var response = await client.PatchAsJsonAsync(
            TableUrl(TestDataSeeder.RestaurantAId, created.Id),
            new { Name = "Table 02 Updated", Zone = "Upper Floor" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await ReadTableAsync(response);
        updated.Name.Should().Be("Table 02 Updated");
        updated.Zone.Should().Be("Upper Floor");
    }

    [Fact]
    public async Task UpdateStatus_DisablesAndEnablesTable()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var created = await CreateTableAsync(client, "Table 03", null);

        var disableResponse = await client.PatchAsJsonAsync(
            TableStatusUrl(TestDataSeeder.RestaurantAId, created.Id),
            new { IsActive = false });
        disableResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        (await ReadTableAsync(disableResponse)).IsActive.Should().BeFalse();

        var enableResponse = await client.PatchAsJsonAsync(
            TableStatusUrl(TestDataSeeder.RestaurantAId, created.Id),
            new { IsActive = true });
        enableResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        (await ReadTableAsync(enableResponse)).IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task RegenerateToken_InvalidatesOldToken()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var created = await CreateTableAsync(client, "Table 04", null);
        var oldToken = created.PublicToken;

        var regenerateResponse = await client.PostAsync(
            TableRegenerateUrl(TestDataSeeder.RestaurantAId, created.Id),
            null);
        regenerateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var regenerated = await ReadTableAsync(regenerateResponse);
        regenerated.PublicToken.Should().NotBe(oldToken);

        var oldResolve = await client.GetAsync(ResolveUrl("restaurant-a", oldToken));
        oldResolve.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var newResolve = await client.GetAsync(ResolveUrl("restaurant-a", regenerated.PublicToken));
        newResolve.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task OwnerB_CannotAccessRestaurantATables()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerBEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync(TablesUrl(TestDataSeeder.RestaurantAId));
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Resolve_ActiveTable_ReturnsTableInfo()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateOwnerAAsync(client);

        var created = await CreateTableAsync(client, "Table 05", "Indoor");

        var response = await client.GetAsync(ResolveUrl("restaurant-a", created.PublicToken));
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var resolved = await response.Content.ReadFromJsonAsync<ResolvedTableResponse>(JsonOptions);
        resolved.Should().NotBeNull();
        resolved!.TableId.Should().Be(created.Id);
        resolved.TableName.Should().Be("Table 05");
        resolved.Zone.Should().Be("Indoor");
        resolved.RestaurantId.Should().Be(TestDataSeeder.RestaurantAId);
    }

    [Fact]
    public async Task Resolve_DisabledTable_Returns409()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateOwnerAAsync(client);

        var created = await CreateTableAsync(client, "Table 06", null);
        await client.PatchAsJsonAsync(
            TableStatusUrl(TestDataSeeder.RestaurantAId, created.Id),
            new { IsActive = false });

        var response = await client.GetAsync(ResolveUrl("restaurant-a", created.PublicToken));
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task DineInOrder_RequiresTableToken()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Dine Guest",
                GuestPhone = "+15550111111",
                OrderType = OrderType.DineIn,
                Items = new[] { CreateItem(TestDataSeeder.MenuItemAId, 1) }
            });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task DineInOrder_AcceptsValidToken()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateOwnerAAsync(client);

        var table = await CreateTableAsync(client, "Table 07", "Indoor");
        client.DefaultRequestHeaders.Authorization = null;

        var response = await client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Dine Guest",
                GuestPhone = "+15550111111",
                OrderType = OrderType.DineIn,
                TableToken = table.PublicToken,
                Items = new[] { CreateItem(TestDataSeeder.MenuItemAId, 1) }
            });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var order = await db.Orders
            .OrderByDescending(o => o.CreatedAt)
            .FirstAsync(o => o.GuestName == "Dine Guest");

        order.OrderType.Should().Be(OrderType.DineIn);
        order.TableId.Should().Be(table.Id);
        order.DeliveryAddress.Should().BeNull();
    }

    [Fact]
    public async Task DineInOrder_RejectsInvalidToken()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Dine Guest",
                GuestPhone = "+15550111111",
                OrderType = OrderType.DineIn,
                TableToken = "invalid-token-value",
                Items = new[] { CreateItem(TestDataSeeder.MenuItemAId, 1) }
            });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DineInOrder_RejectsTokenFromOtherRestaurant()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateOwnerAAsync(client);
        var tableA = await CreateTableAsync(client, "Table A", null);

        await AuthenticateAsync(client, TestDataSeeder.OwnerBEmail, TestDataSeeder.CorrectPassword);
        var tableB = await CreateTableAsync(client, "Table B", null, TestDataSeeder.RestaurantBId);
        client.DefaultRequestHeaders.Authorization = null;

        var response = await client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Cross Restaurant",
                GuestPhone = "+15550222222",
                OrderType = OrderType.DineIn,
                TableToken = tableB.PublicToken,
                Items = new[] { CreateItem(TestDataSeeder.MenuItemAId, 1) }
            });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        tableA.Id.Should().NotBe(tableB.Id);
    }

    [Fact]
    public async Task PickupOrder_StillWorks()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Pickup Guest",
                GuestPhone = "+15550333333",
                OrderType = OrderType.Pickup,
                Items = new[] { CreateItem(TestDataSeeder.MenuItemAId, 1) }
            });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var confirmation = await response.Content.ReadFromJsonAsync<OrderConfirmationResponse>(JsonOptions);
        confirmation!.OrderType.Should().Be(OrderType.Pickup);
    }

    [Fact]
    public async Task DeliveryOrder_StillWorks()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            OrdersUrl("restaurant-a"),
            new
            {
                GuestName = "Delivery Guest",
                GuestPhone = "+15550444444",
                OrderType = OrderType.Delivery,
                DeliveryAddress = "123 Main St",
                Items = new[] { CreateItem(TestDataSeeder.MenuItemAId, 1) }
            });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var confirmation = await response.Content.ReadFromJsonAsync<OrderConfirmationResponse>(JsonOptions);
        confirmation!.OrderType.Should().Be(OrderType.Delivery);
    }

    [Fact]
    public async Task CreateTable_UsesDateTimeServiceTimestamps()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateOwnerAAsync(client);

        var before = DateTime.UtcNow.AddMinutes(-1);
        var created = await CreateTableAsync(client, "Table TS", null);
        var after = DateTime.UtcNow.AddMinutes(1);

        created.CreatedAt.Should().BeAfter(before).And.BeBefore(after);
        created.UpdatedAt.Should().BeNull();

        var updateResponse = await client.PatchAsJsonAsync(
            TableUrl(TestDataSeeder.RestaurantAId, created.Id),
            new { Name = "Table TS Updated", Zone = (string?)null });
        var updated = await ReadTableAsync(updateResponse);
        updated.UpdatedAt.Should().NotBeNull();
        updated.UpdatedAt!.Value.Should().BeAfter(before).And.BeBefore(after.AddMinutes(1));
    }

    private async Task<TableResponse> CreateTableAsync(
        HttpClient client,
        string name,
        string? zone,
        Guid? restaurantId = null)
    {
        var response = await client.PostAsJsonAsync(
            TablesUrl(restaurantId ?? TestDataSeeder.RestaurantAId),
            new { Name = name, Zone = zone, IsActive = true });
        response.EnsureSuccessStatusCode();
        return (await ReadTableAsync(response))!;
    }

    private static async Task<TableResponse> ReadTableAsync(HttpResponseMessage response)
    {
        var table = await response.Content.ReadFromJsonAsync<TableResponse>(JsonOptions);
        table.Should().NotBeNull();
        return table!;
    }

    private static object CreateItem(Guid menuItemId, int quantity) =>
        new { MenuItemId = menuItemId, Quantity = quantity };

    private static string TablesUrl(Guid restaurantId) =>
        $"/api/v1/admin/restaurants/{restaurantId}/tables";

    private static string TableUrl(Guid restaurantId, Guid tableId) =>
        $"/api/v1/admin/restaurants/{restaurantId}/tables/{tableId}";

    private static string TableStatusUrl(Guid restaurantId, Guid tableId) =>
        $"/api/v1/admin/restaurants/{restaurantId}/tables/{tableId}/status";

    private static string TableRegenerateUrl(Guid restaurantId, Guid tableId) =>
        $"/api/v1/admin/restaurants/{restaurantId}/tables/{tableId}/regenerate-token";

    private static string ResolveUrl(string slug, string token) =>
        $"/api/v1/public/restaurants/{slug}/tables/resolve?token={Uri.EscapeDataString(token)}";

    private static string OrdersUrl(string slug) =>
        $"/api/v1/public/restaurants/{slug}/orders";

    private static async Task AuthenticateOwnerAAsync(HttpClient client) =>
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

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
        return payload!.AccessToken;
    }

    private HttpClient CreateHttpsClient() =>
        _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

    private sealed class LoginResponseModel
    {
        public string AccessToken { get; init; } = string.Empty;
    }

    private sealed class TableResponse
    {
        public Guid Id { get; init; }
        public string Name { get; init; } = string.Empty;
        public string? Zone { get; init; }
        public string PublicToken { get; init; } = string.Empty;
        public bool IsActive { get; init; }
        public DateTime CreatedAt { get; init; }
        public DateTime? UpdatedAt { get; init; }
    }

    private sealed class ResolvedTableResponse
    {
        public Guid TableId { get; init; }
        public string TableName { get; init; } = string.Empty;
        public string? Zone { get; init; }
        public Guid RestaurantId { get; init; }
    }

    private sealed class OrderConfirmationResponse
    {
        public OrderType OrderType { get; init; }
    }
}

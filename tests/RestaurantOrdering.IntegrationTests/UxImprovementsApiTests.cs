using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

/// <summary>API behaviour behind UX-001 (staff edit / activation), UX-004 (activity) and UX-007 (table archive).</summary>
public sealed class UxImprovementsApiTests : IClassFixture<TestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private readonly TestWebApplicationFactory _factory;

    public UxImprovementsApiTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private static string UsersUrl => $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users";
    private static string TablesUrl => $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/tables";

    // ───────────────────────── UX-001 staff ─────────────────────────

    [Fact]
    public async Task UpdateStaff_ChangesNameAndPhone_KeepsRoleAndEmail()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = await OwnerClientAsync();

        var response = await owner.PatchAsJsonAsync(
            $"{UsersUrl}/{TestDataSeeder.ManagerAUserId}",
            new { FullName = "  Renamed Manager ", PhoneNumber = "0790000000" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await ReadAsync(response);
        body.GetProperty("fullName").GetString().Should().Be("Renamed Manager");
        body.GetProperty("phoneNumber").GetString().Should().Be("0790000000");
        body.GetProperty("email").GetString().Should().Be(TestDataSeeder.ManagerAEmail);
        body.GetProperty("role").GetString().Should().Be("RestaurantManager");

        var list = await ReadAsync(await owner.GetAsync(UsersUrl));
        list.EnumerateArray()
            .Single(user => user.GetProperty("id").GetGuid() == TestDataSeeder.ManagerAUserId)
            .GetProperty("fullName").GetString().Should().Be("Renamed Manager");
    }

    [Fact]
    public async Task UpdateStaff_WithOverlongName_Returns400()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = await OwnerClientAsync();

        var response = await owner.PatchAsJsonAsync(
            $"{UsersUrl}/{TestDataSeeder.ManagerAUserId}",
            new { FullName = new string('x', 151), PhoneNumber = (string?)null });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task DeactivatedStaff_CannotSignIn_AndCanBeReactivated()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = await OwnerClientAsync();

        (await LoginAsync(TestDataSeeder.KitchenAEmail)).StatusCode.Should().Be(HttpStatusCode.OK);

        var deactivate = await owner.PatchAsJsonAsync(
            $"{UsersUrl}/{TestDataSeeder.KitchenAUserId}/status", new { IsActive = false });
        deactivate.StatusCode.Should().Be(HttpStatusCode.OK);
        (await ReadAsync(deactivate)).GetProperty("isActive").GetBoolean().Should().BeFalse();

        (await LoginAsync(TestDataSeeder.KitchenAEmail)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var reactivate = await owner.PatchAsJsonAsync(
            $"{UsersUrl}/{TestDataSeeder.KitchenAUserId}/status", new { IsActive = true });
        reactivate.StatusCode.Should().Be(HttpStatusCode.OK);
        (await LoginAsync(TestDataSeeder.KitchenAEmail)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DeactivatingStaff_KeepsTheRecordAndItsRole()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = await OwnerClientAsync();

        (await owner.PatchAsJsonAsync(
            $"{UsersUrl}/{TestDataSeeder.ManagerAUserId}/status", new { IsActive = false })).EnsureSuccessStatusCode();

        var list = await ReadAsync(await owner.GetAsync(UsersUrl));
        var manager = list.EnumerateArray().Single(u => u.GetProperty("id").GetGuid() == TestDataSeeder.ManagerAUserId);
        manager.GetProperty("isActive").GetBoolean().Should().BeFalse();
        manager.GetProperty("role").GetString().Should().Be("RestaurantManager");

        (await owner.PatchAsJsonAsync(
            $"{UsersUrl}/{TestDataSeeder.ManagerAUserId}/status", new { IsActive = true })).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Owner_CannotDeactivateTheirOwnAccount()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = await OwnerClientAsync();

        var response = await owner.PatchAsJsonAsync(
            $"{UsersUrl}/{TestDataSeeder.OwnerAUserId}/status", new { IsActive = false });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task StaffOfAnotherRestaurant_IsNotFound()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = await OwnerClientAsync();

        var response = await owner.PatchAsJsonAsync(
            $"{UsersUrl}/{TestDataSeeder.OwnerBUserId}/status", new { IsActive = false });

        response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Manager_CannotEditOrDeactivateStaff()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var manager = CreateClient();
        await AuthenticateAsync(manager, TestDataSeeder.ManagerAEmail);

        (await manager.PatchAsJsonAsync(
            $"{UsersUrl}/{TestDataSeeder.KitchenAUserId}", new { FullName = "x", PhoneNumber = (string?)null }))
            .StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await manager.PatchAsJsonAsync(
            $"{UsersUrl}/{TestDataSeeder.KitchenAUserId}/status", new { IsActive = false }))
            .StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ───────────────────────── UX-007 table archive ─────────────────────────

    [Fact]
    public async Task ArchivedTable_IsHiddenByDefault_VisibleOnRequest_AndRestorableAsInactive()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = await OwnerClientAsync();
        var table = await CreateTableAsync(owner, "QA_UX_T1");

        var archived = await owner.PatchAsJsonAsync($"{TablesUrl}/{table.Id}/archive", new { IsArchived = true });
        archived.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await ReadAsync(archived);
        body.GetProperty("isArchived").GetBoolean().Should().BeTrue();
        body.GetProperty("isActive").GetBoolean().Should().BeFalse();

        var defaultList = await ReadAsync(await owner.GetAsync(TablesUrl));
        defaultList.EnumerateArray().Select(t => t.GetProperty("id").GetGuid()).Should().NotContain(table.Id);

        var fullList = await ReadAsync(await owner.GetAsync($"{TablesUrl}?includeArchived=true"));
        fullList.EnumerateArray().Select(t => t.GetProperty("id").GetGuid()).Should().Contain(table.Id);

        var restored = await owner.PatchAsJsonAsync($"{TablesUrl}/{table.Id}/archive", new { IsArchived = false });
        var restoredBody = await ReadAsync(restored);
        restoredBody.GetProperty("isArchived").GetBoolean().Should().BeFalse();
        restoredBody.GetProperty("isActive").GetBoolean().Should().BeFalse(); // stays off until re-enabled deliberately

        var defaultAfter = await ReadAsync(await owner.GetAsync(TablesUrl));
        defaultAfter.EnumerateArray().Select(t => t.GetProperty("id").GetGuid()).Should().Contain(table.Id);
    }

    [Fact]
    public async Task ArchivedTable_RejectsQrOrders_AndCannotBeActivated()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = await OwnerClientAsync();
        var table = await CreateTableAsync(owner, "QA_UX_T2");
        (await owner.PatchAsJsonAsync($"{TablesUrl}/{table.Id}/archive", new { IsArchived = true })).EnsureSuccessStatusCode();

        using var anonymous = CreateClient();
        var order = await anonymous.PostAsJsonAsync(
            "/api/v1/public/restaurants/restaurant-a/orders",
            new
            {
                GuestName = "QA_UX archived",
                GuestPhone = "+15550111111",
                OrderType = OrderType.DineIn,
                TableToken = table.Token,
                Items = new[] { new { MenuItemId = TestDataSeeder.MenuItemAId, Quantity = 1 } }
            });
        order.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.Conflict);

        var activate = await owner.PatchAsJsonAsync($"{TablesUrl}/{table.Id}/status", new { IsActive = true });
        activate.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task ArchivingATable_KeepsHistoricalOrdersAndTheirTableName()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = await OwnerClientAsync();
        var table = await CreateTableAsync(owner, "QA_UX_T3");

        using var anonymous = CreateClient();
        var guest = $"QA_UX_hist_{Guid.NewGuid():N}";
        var placed = await anonymous.PostAsJsonAsync(
            "/api/v1/public/restaurants/restaurant-a/orders",
            new
            {
                GuestName = guest,
                GuestPhone = "+15550111111",
                OrderType = OrderType.DineIn,
                TableToken = table.Token,
                Items = new[] { new { MenuItemId = TestDataSeeder.MenuItemAId, Quantity = 1 } }
            });
        placed.StatusCode.Should().Be(HttpStatusCode.Created);
        var orderId = (await ReadAsync(placed)).GetProperty("orderId").GetGuid();

        (await owner.PatchAsJsonAsync($"{TablesUrl}/{table.Id}/archive", new { IsArchived = true })).EnsureSuccessStatusCode();

        var details = await ReadAsync(await owner.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/orders/{orderId}"));
        details.GetProperty("tableName").GetString().Should().Be("QA_UX_T3");
        details.GetProperty("tableId").GetGuid().Should().Be(table.Id);
    }

    [Fact]
    public async Task ArchiveTable_OfAnotherRestaurant_IsRejected()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = await OwnerClientAsync();

        var response = await owner.PatchAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}/tables/{Guid.NewGuid()}/archive",
            new { IsArchived = true });

        response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.NotFound);
    }

    // ───────────────────────── UX-004 activity ─────────────────────────

    [Fact]
    public async Task Activity_ReturnsSevenDaysOldestFirst_WithTodaysRealOrders()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = await OwnerClientAsync();
        var url = $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/dashboard/activity";

        var body = await ReadAsync(await owner.GetAsync(url));
        var days = body.GetProperty("days").EnumerateArray().ToList();

        days.Should().HaveCount(7);
        days.Select(d => d.GetProperty("date").GetString()).Should().BeInAscendingOrder();
        // seeded orders were created "now": today (last bar) must contain them
        days[^1].GetProperty("orders").GetInt32().Should().BeGreaterThanOrEqualTo(5);
        days.Take(6).Sum(d => d.GetProperty("orders").GetInt32()).Should().Be(0);
        body.GetProperty("currencyCode").GetString().Should().Be("SAR");
    }

    [Fact]
    public async Task Activity_CountsCancelledSeparately_AndExcludesThemFromSales()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = await OwnerClientAsync();
        var url = $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/dashboard/activity";

        var today = (await ReadAsync(await owner.GetAsync(url))).GetProperty("days").EnumerateArray().Last();

        today.GetProperty("cancelledOrders").GetInt32().Should().BeGreaterThanOrEqualTo(1); // seeded cancelled order
        today.GetProperty("orders").GetInt32().Should().BeGreaterThan(today.GetProperty("cancelledOrders").GetInt32());
        // 5 seeded orders of 25 SAR, one cancelled -> sales exclude it
        today.GetProperty("sales").GetDecimal().Should().BeLessThan(today.GetProperty("orders").GetInt32() * 25m);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(32)]
    public async Task Activity_RejectsInvalidDayCounts(int days)
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = await OwnerClientAsync();

        var response = await owner.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/dashboard/activity?days={days}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Activity_IsOwnerAndManagerOnly()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        var url = $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/dashboard/activity";

        using (var anonymous = CreateClient())
        {
            (await anonymous.GetAsync(url)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        using (var kitchen = CreateClient())
        {
            await AuthenticateAsync(kitchen, TestDataSeeder.KitchenAEmail);
            (await kitchen.GetAsync(url)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        using var manager = CreateClient();
        await AuthenticateAsync(manager, TestDataSeeder.ManagerAEmail);
        (await manager.GetAsync(url)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ───────────────────────── helpers ─────────────────────────

    private async Task<(Guid Id, string Token)> CreateTableAsync(HttpClient owner, string name)
    {
        var response = await owner.PostAsJsonAsync(TablesUrl, new { Name = name, Zone = "QA_UX", IsActive = true });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await ReadAsync(response);
        return (body.GetProperty("id").GetGuid(), body.GetProperty("publicToken").GetString()!);
    }

    private static async Task<JsonElement> ReadAsync(HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(text).RootElement.Clone();
    }

    private async Task<HttpClient> OwnerClientAsync()
    {
        var client = CreateClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail);
        return client;
    }

    private async Task<HttpResponseMessage> LoginAsync(string email)
    {
        using var client = CreateClient();
        return await client.PostAsJsonAsync(
            "/api/v1/auth/login", new { Email = email, Password = TestDataSeeder.CorrectPassword });
    }

    private static async Task AuthenticateAsync(HttpClient client, string email)
    {
        var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login", new { Email = email, Password = TestDataSeeder.CorrectPassword });
        login.EnsureSuccessStatusCode();
        var payload = await login.Content.ReadFromJsonAsync<LoginModel>(JsonOptions);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", payload!.AccessToken);
    }

    private HttpClient CreateClient() =>
        _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

    private sealed class LoginModel
    {
        public string AccessToken { get; init; } = string.Empty;
    }
}

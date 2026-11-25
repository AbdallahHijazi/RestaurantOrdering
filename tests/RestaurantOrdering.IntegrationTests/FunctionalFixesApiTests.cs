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

/// <summary>
/// Regression tests for the 13 confirmed functional defects (BUG-001 … BUG-013) that are observable
/// through the HTTP API.
/// </summary>
public sealed class FunctionalFixesApiTests : IClassFixture<TestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly TestWebApplicationFactory _factory;

    public FunctionalFixesApiTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ───────────────────────────── BUG-013 idempotency ─────────────────────────────

    [Fact]
    public async Task Bug013_SameKeyAndPayload_ReturnsTheOriginalOrder_AndCreatesOnlyOne()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateClient();
        var key = $"qa-fix-{Guid.NewGuid():N}";
        var guest = $"QA_FIX_idem_{Guid.NewGuid():N}";

        var first = await PostPickupAsync(client, guest, idempotencyKey: key);
        var replay = await PostPickupAsync(client, guest, idempotencyKey: key);

        first.StatusCode.Should().Be(HttpStatusCode.Created);
        replay.StatusCode.Should().Be(HttpStatusCode.Created);

        var firstBody = await ReadJsonAsync(first);
        var replayBody = await ReadJsonAsync(replay);
        replayBody.GetProperty("orderId").GetGuid().Should().Be(firstBody.GetProperty("orderId").GetGuid());
        replayBody.GetProperty("orderNumber").GetString().Should().Be(firstBody.GetProperty("orderNumber").GetString());
        replayBody.GetProperty("totalAmount").GetDecimal().Should().Be(firstBody.GetProperty("totalAmount").GetDecimal());

        (await CountOrdersAsync(guest)).Should().Be(1);
    }

    [Fact]
    public async Task Bug013_SameKeyWithDifferentPayload_Returns409_AndDoesNotCreateAnotherOrder()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateClient();
        var key = $"qa-fix-{Guid.NewGuid():N}";
        var guest = $"QA_FIX_mismatch_{Guid.NewGuid():N}";

        (await PostPickupAsync(client, guest, quantity: 1, idempotencyKey: key))
            .StatusCode.Should().Be(HttpStatusCode.Created);

        var conflicting = await PostPickupAsync(client, guest, quantity: 3, idempotencyKey: key);

        conflicting.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await CountOrdersAsync(guest)).Should().Be(1);
    }

    [Fact]
    public async Task Bug013_IdenticalOrdersWithDifferentKeys_AreTwoSeparateValidOrders()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateClient();
        var guest = $"QA_FIX_twice_{Guid.NewGuid():N}";

        var first = await PostPickupAsync(client, guest, idempotencyKey: $"qa-fix-{Guid.NewGuid():N}");
        var second = await PostPickupAsync(client, guest, idempotencyKey: $"qa-fix-{Guid.NewGuid():N}");

        first.StatusCode.Should().Be(HttpStatusCode.Created);
        second.StatusCode.Should().Be(HttpStatusCode.Created);
        (await ReadJsonAsync(second)).GetProperty("orderId").GetGuid()
            .Should().NotBe((await ReadJsonAsync(first)).GetProperty("orderId").GetGuid());
        (await CountOrdersAsync(guest)).Should().Be(2);
    }

    [Fact]
    public async Task Bug013_RequestsWithoutAKey_StillCreateSeparateOrders_ForBackwardCompatibility()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateClient();
        var guest = $"QA_FIX_nokey_{Guid.NewGuid():N}";

        (await PostPickupAsync(client, guest)).StatusCode.Should().Be(HttpStatusCode.Created);
        (await PostPickupAsync(client, guest)).StatusCode.Should().Be(HttpStatusCode.Created);

        (await CountOrdersAsync(guest)).Should().Be(2);
    }

    [Fact]
    public async Task Bug013_KeyCanAlsoBeSuppliedThroughTheIdempotencyKeyHeader()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateClient();
        var guest = $"QA_FIX_header_{Guid.NewGuid():N}";
        var key = $"qa-fix-{Guid.NewGuid():N}";

        var first = await PostPickupAsync(client, guest, headerKey: key);
        var replay = await PostPickupAsync(client, guest, headerKey: key);

        (await ReadJsonAsync(replay)).GetProperty("orderId").GetGuid()
            .Should().Be((await ReadJsonAsync(first)).GetProperty("orderId").GetGuid());
        (await CountOrdersAsync(guest)).Should().Be(1);
    }

    [Fact]
    public async Task Bug013_FailedValidationDoesNotConsumeTheKey_AndTheCorrectedRetryIsAccepted()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateClient();
        var guest = $"QA_FIX_retry_{Guid.NewGuid():N}";
        var key = $"qa-fix-{Guid.NewGuid():N}";

        (await PostPickupAsync(client, guest, phone: "abc", idempotencyKey: key))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await CountOrdersAsync(guest)).Should().Be(0);

        (await PostPickupAsync(client, guest, phone: "+962791234567", idempotencyKey: key))
            .StatusCode.Should().Be(HttpStatusCode.Created);
        (await CountOrdersAsync(guest)).Should().Be(1);
    }

    [Fact]
    public void Bug013_OrdersTableEnforcesUniquenessOfRestaurantAndKey_OnlyWhenAKeyIsPresent()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var index = db.Model.FindEntityType(typeof(Order))!
            .GetIndexes()
            .Single(i => i.Properties.Select(p => p.Name).SequenceEqual(
                [nameof(Order.RestaurantId), nameof(Order.IdempotencyKey)]));

        index.IsUnique.Should().BeTrue();
        index.GetFilter().Should().Contain("IdempotencyKey").And.Contain("IS NOT NULL");
    }

    // ───────────────────────────── BUG-012 phone validation ─────────────────────────────

    [Theory]
    [InlineData("abc")]
    [InlineData("12")]
    [InlineData("1234567890123456789")]
    [InlineData("+++++++++")]
    public async Task Bug012_InvalidPhone_Returns400_AndNoOrderIsPersisted(string phone)
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateClient();
        var guest = $"QA_FIX_phone_{Guid.NewGuid():N}";

        var response = await PostPickupAsync(client, guest, phone: phone);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await CountOrdersAsync(guest)).Should().Be(0);
    }

    [Theory]
    [InlineData("0791234567")]
    [InlineData("+962 79 123 4567")]
    [InlineData("(555) 010-1010")]
    [InlineData("00962791234567")]
    public async Task Bug012_ValidLocalAndInternationalPhones_AreAccepted(string phone)
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateClient();
        var guest = $"QA_FIX_phoneok_{Guid.NewGuid():N}";

        var response = await PostPickupAsync(client, guest, phone: phone);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        (await CountOrdersAsync(guest)).Should().Be(1);
    }

    // ───────────────────────────── BUG-004 table information ─────────────────────────────

    [Fact]
    public async Task Bug004_DineInOrder_ExposesTheTableInListDetailsAndStatusUpdate_ButPickupDoesNot()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail);

        var tableName = $"QA_FIX_T{Guid.NewGuid():N}"[..14];
        var tableResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/tables",
            new { Name = tableName, Zone = "Indoor", IsActive = true });
        tableResponse.EnsureSuccessStatusCode();
        var table = await ReadJsonAsync(tableResponse);
        var tableId = table.GetProperty("id").GetGuid();
        var token = table.GetProperty("publicToken").GetString();

        var dineGuest = $"QA_FIX_dine_{Guid.NewGuid():N}";
        var pickupGuest = $"QA_FIX_pick_{Guid.NewGuid():N}";
        using var anonymous = CreateClient();
        (await anonymous.PostAsJsonAsync(
            OrdersUrl(),
            new
            {
                GuestName = dineGuest,
                GuestPhone = "+15550111111",
                OrderType = OrderType.DineIn,
                TableToken = token,
                Items = new[] { Item(1) }
            })).StatusCode.Should().Be(HttpStatusCode.Created);
        (await PostPickupAsync(anonymous, pickupGuest)).StatusCode.Should().Be(HttpStatusCode.Created);

        // list
        var dineList = await GetJsonAsync(client, $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/orders?searchTerm={dineGuest}");
        var dineRow = dineList.GetProperty("items").EnumerateArray().Single();
        dineRow.GetProperty("tableId").GetGuid().Should().Be(tableId);
        dineRow.GetProperty("tableName").GetString().Should().Be(tableName);

        var pickupList = await GetJsonAsync(client, $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/orders?searchTerm={pickupGuest}");
        var pickupRow = pickupList.GetProperty("items").EnumerateArray().Single();
        pickupRow.GetProperty("tableId").ValueKind.Should().Be(JsonValueKind.Null);
        pickupRow.GetProperty("tableName").ValueKind.Should().Be(JsonValueKind.Null);

        // details
        var orderId = dineRow.GetProperty("id").GetGuid();
        var details = await GetJsonAsync(client, $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/orders/{orderId}");
        details.GetProperty("tableName").GetString().Should().Be(tableName);
        details.GetProperty("tableId").GetGuid().Should().Be(tableId);

        // status update keeps the table (the UI replaces the list row with this response)
        var statusResponse = await client.PatchAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/orders/{orderId}/status",
            new { NewStatus = OrderStatus.Preparing });
        statusResponse.EnsureSuccessStatusCode();
        (await ReadJsonAsync(statusResponse)).GetProperty("tableName").GetString().Should().Be(tableName);
    }

    [Fact]
    public async Task Bug004_KitchenManager_SeesTheTableOnDineInOrders()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = CreateClient();
        await AuthenticateAsync(owner, TestDataSeeder.OwnerAEmail);
        var tableName = $"QA_FIX_K{Guid.NewGuid():N}"[..14];
        var tableResponse = await owner.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/tables",
            new { Name = tableName, IsActive = true });
        tableResponse.EnsureSuccessStatusCode();
        var token = (await ReadJsonAsync(tableResponse)).GetProperty("publicToken").GetString();
        var guest = $"QA_FIX_kdine_{Guid.NewGuid():N}";

        using var anonymous = CreateClient();
        (await anonymous.PostAsJsonAsync(
            OrdersUrl(),
            new
            {
                GuestName = guest,
                GuestPhone = "+15550111111",
                OrderType = OrderType.DineIn,
                TableToken = token,
                Items = new[] { Item(1) }
            })).StatusCode.Should().Be(HttpStatusCode.Created);

        using var kitchen = CreateClient();
        await AuthenticateAsync(kitchen, TestDataSeeder.KitchenAEmail);
        var list = await GetJsonAsync(
            kitchen,
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/orders?status={(int)OrderStatus.New}&searchTerm={guest}");

        list.GetProperty("items").EnumerateArray().Single()
            .GetProperty("tableName").GetString().Should().Be(tableName);
    }

    // ───────────────────────────── BUG-005 server-side search & totals ─────────────────────────────

    [Fact]
    public async Task Bug005_SearchCoversTheWholeDataset_AndTotalCountIsAuthoritative()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var anonymous = CreateClient();
        var marker = $"QA_FIX_page_{Guid.NewGuid():N}"[..20];

        // The "needle" is the OLDEST order; 25 newer orders push it beyond the first page of 20.
        var needle = await PostPickupAsync(anonymous, $"{marker}_needle");
        needle.StatusCode.Should().Be(HttpStatusCode.Created);
        var needleNumber = (await ReadJsonAsync(needle)).GetProperty("orderNumber").GetString()!;
        await Task.Delay(30);
        for (var i = 0; i < 25; i++)
        {
            (await PostPickupAsync(anonymous, $"{marker}_filler{i:00}")).StatusCode.Should().Be(HttpStatusCode.Created);
        }

        using var owner = CreateClient();
        await AuthenticateAsync(owner, TestDataSeeder.OwnerAEmail);
        var baseUrl = $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/orders";

        var firstPage = await GetJsonAsync(owner, $"{baseUrl}?pageNumber=1&pageSize=20");
        firstPage.GetProperty("items").GetArrayLength().Should().Be(20);
        firstPage.GetProperty("totalCount").GetInt32().Should().BeGreaterThan(20);
        firstPage.GetProperty("items").EnumerateArray()
            .Select(item => item.GetProperty("orderNumber").GetString())
            .Should().NotContain(needleNumber);

        var byNumber = await GetJsonAsync(owner, $"{baseUrl}?searchTerm={needleNumber}");
        byNumber.GetProperty("totalCount").GetInt32().Should().Be(1);
        byNumber.GetProperty("items").EnumerateArray().Single()
            .GetProperty("orderNumber").GetString().Should().Be(needleNumber);

        var byGuest = await GetJsonAsync(owner, $"{baseUrl}?searchTerm={marker}_filler&pageSize=100");
        byGuest.GetProperty("totalCount").GetInt32().Should().Be(25);

        var none = await GetJsonAsync(owner, $"{baseUrl}?searchTerm=NO_SUCH_ORDER_{Guid.NewGuid():N}");
        none.GetProperty("totalCount").GetInt32().Should().Be(0);
        none.GetProperty("items").GetArrayLength().Should().Be(0);

        // pages never overlap
        var page2 = await GetJsonAsync(owner, $"{baseUrl}?searchTerm={marker}&pageNumber=2&pageSize=10");
        var page1 = await GetJsonAsync(owner, $"{baseUrl}?searchTerm={marker}&pageNumber=1&pageSize=10");
        var ids1 = page1.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("id").GetGuid()).ToList();
        var ids2 = page2.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("id").GetGuid()).ToList();
        ids1.Intersect(ids2).Should().BeEmpty();
        page1.GetProperty("totalCount").GetInt32().Should().Be(26);
    }

    // ───────────────────────────── BUG-001 / 002 / 003 dashboard summary ─────────────────────────────

    [Fact]
    public async Task Bug001_DashboardSummary_RequiresOwnerOrManager_AndIsTenantScoped()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        var url = $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/dashboard/summary";

        using (var anonymous = CreateClient())
        {
            (await anonymous.GetAsync(url)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        using (var kitchen = CreateClient())
        {
            await AuthenticateAsync(kitchen, TestDataSeeder.KitchenAEmail);
            (await kitchen.GetAsync(url)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        using (var otherOwner = CreateClient())
        {
            await AuthenticateAsync(otherOwner, TestDataSeeder.OwnerBEmail);
            (await otherOwner.GetAsync(url)).StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.NotFound);
        }

        foreach (var email in new[] { TestDataSeeder.OwnerAEmail, TestDataSeeder.ManagerAEmail })
        {
            using var allowed = CreateClient();
            await AuthenticateAsync(allowed, email);
            (await allowed.GetAsync(url)).StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    [Fact]
    public async Task Bug001_DashboardSummary_CountsEveryOrderOfTheDay_NotJustTheFirstFive()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = CreateClient();
        await AuthenticateAsync(owner, TestDataSeeder.OwnerAEmail);
        var summaryUrl = $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/dashboard/summary";

        var before = await GetJsonAsync(owner, summaryUrl);
        before.GetProperty("currencyCode").GetString().Should().Be("SAR");

        using var anonymous = CreateClient();
        var marker = $"QA_FIX_dash_{Guid.NewGuid():N}";
        var created = new List<Guid>();
        for (var i = 0; i < 8; i++)
        {
            var response = await PostPickupAsync(anonymous, marker);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            created.Add((await ReadJsonAsync(response)).GetProperty("orderId").GetGuid());
        }

        var after = await GetJsonAsync(owner, summaryUrl);
        const decimal orderTotal = 28.75m; // 25.00 + 15% tax
        after.GetProperty("todayOrders").GetInt32().Should().Be(before.GetProperty("todayOrders").GetInt32() + 8);
        after.GetProperty("activeOrders").GetInt32().Should().Be(before.GetProperty("activeOrders").GetInt32() + 8);
        after.GetProperty("todaySales").GetDecimal()
            .Should().Be(before.GetProperty("todaySales").GetDecimal() + 8 * orderTotal);

        // cancelling an order: still an order of the day, no longer active, no longer sales
        (await owner.PatchAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/orders/{created[0]}/status",
            new { NewStatus = OrderStatus.Cancelled })).EnsureSuccessStatusCode();

        var cancelled = await GetJsonAsync(owner, summaryUrl);
        cancelled.GetProperty("todayOrders").GetInt32().Should().Be(after.GetProperty("todayOrders").GetInt32());
        cancelled.GetProperty("todayCancelledOrders").GetInt32()
            .Should().Be(after.GetProperty("todayCancelledOrders").GetInt32() + 1);
        cancelled.GetProperty("activeOrders").GetInt32().Should().Be(after.GetProperty("activeOrders").GetInt32() - 1);
        cancelled.GetProperty("todaySales").GetDecimal()
            .Should().Be(after.GetProperty("todaySales").GetDecimal() - orderTotal);

        var billable = cancelled.GetProperty("todayOrders").GetInt32() - cancelled.GetProperty("todayCancelledOrders").GetInt32();
        cancelled.GetProperty("averageOrderValue").GetDecimal().Should().Be(
            Math.Round(cancelled.GetProperty("todaySales").GetDecimal() / billable, 2, MidpointRounding.AwayFromZero));
    }

    // ───────────────────────────── BUG-006 profile persistence ─────────────────────────────

    [Fact]
    public async Task Bug006_ProfileFields_ArePersistedAndReturnedAfterReload()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = CreateClient();
        await AuthenticateAsync(owner, TestDataSeeder.OwnerAEmail);
        var url = $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}";

        var save = await owner.PutAsJsonAsync(url, RestaurantPayload(
            countryCode: "jo", phoneCountryCode: "962", email: "info@qa-fix.test", city: "Amman"));
        save.StatusCode.Should().Be(HttpStatusCode.OK);
        var saved = await ReadJsonAsync(save);
        saved.GetProperty("countryCode").GetString().Should().Be("JO");
        saved.GetProperty("phoneCountryCode").GetString().Should().Be("+962");
        saved.GetProperty("email").GetString().Should().Be("info@qa-fix.test");
        saved.GetProperty("city").GetString().Should().Be("Amman");

        var reloaded = await GetJsonAsync(owner, url);
        reloaded.GetProperty("countryCode").GetString().Should().Be("JO");
        reloaded.GetProperty("phoneCountryCode").GetString().Should().Be("+962");
        reloaded.GetProperty("email").GetString().Should().Be("info@qa-fix.test");
        reloaded.GetProperty("city").GetString().Should().Be("Amman");

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var row = await db.Restaurants.AsNoTracking().SingleAsync(r => r.Id == TestDataSeeder.RestaurantAId);
        (row.CountryCode, row.PhoneCountryCode, row.Email, row.City)
            .Should().Be(("JO", "+962", "info@qa-fix.test", "Amman"));
    }

    [Fact]
    public async Task Bug006_OmittedFields_KeepTheStoredValues_AndEmptyEmailOrCityClearThem()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = CreateClient();
        await AuthenticateAsync(owner, TestDataSeeder.OwnerAEmail);
        var url = $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}";

        (await owner.PutAsJsonAsync(url, RestaurantPayload(
            countryCode: "SA", phoneCountryCode: "+966", email: "keep@qa-fix.test", city: "Riyadh")))
            .EnsureSuccessStatusCode();

        // legacy client: new properties are not sent at all
        (await owner.PutAsJsonAsync(url, RestaurantPayload(includeNewFields: false))).EnsureSuccessStatusCode();
        var kept = await GetJsonAsync(owner, url);
        kept.GetProperty("countryCode").GetString().Should().Be("SA");
        kept.GetProperty("email").GetString().Should().Be("keep@qa-fix.test");
        kept.GetProperty("city").GetString().Should().Be("Riyadh");

        // explicit empty strings clear the optional values
        (await owner.PutAsJsonAsync(url, RestaurantPayload(
            countryCode: "SA", phoneCountryCode: "+966", email: "", city: ""))).EnsureSuccessStatusCode();
        var cleared = await GetJsonAsync(owner, url);
        cleared.GetProperty("email").ValueKind.Should().Be(JsonValueKind.Null);
        cleared.GetProperty("city").ValueKind.Should().Be(JsonValueKind.Null);
        cleared.GetProperty("countryCode").GetString().Should().Be("SA");
    }

    [Theory]
    [InlineData("J", "+962", "a@b.test")]
    [InlineData("JOR", "+962", "a@b.test")]
    [InlineData("JO", "abc", "a@b.test")]
    [InlineData("JO", "+962", "not-an-email")]
    public async Task Bug006_InvalidProfileValues_AreRejectedWith400(string country, string phoneCode, string email)
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = CreateClient();
        await AuthenticateAsync(owner, TestDataSeeder.OwnerAEmail);

        var response = await owner.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}",
            RestaurantPayload(countryCode: country, phoneCountryCode: phoneCode, email: email, city: "X"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Bug006_TimeZone_IsPersistedBySettings_AndInvalidValuesAreRejected()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var owner = CreateClient();
        await AuthenticateAsync(owner, TestDataSeeder.OwnerAEmail);
        var url = $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/settings";

        var invalid = await owner.PutAsJsonAsync(url, SettingsPayload("Mars/Olympus_Mons"));
        invalid.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var valid = await owner.PutAsJsonAsync(url, SettingsPayload("Asia/Amman"));
        valid.StatusCode.Should().Be(HttpStatusCode.OK);
        (await GetJsonAsync(owner, url)).GetProperty("timeZone").GetString().Should().Be("Asia/Amman");

        // restore
        (await owner.PutAsJsonAsync(url, SettingsPayload("Asia/Riyadh"))).EnsureSuccessStatusCode();
    }

    // ───────────────────────────── BUG-011 public image URLs ─────────────────────────────

    [Fact]
    public async Task Bug011_PublicRestaurantEndpoint_ReturnsTheSameImageUrlsAsTheMenuEndpoint()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateClient();

        await SetBrandingFilesAsync(logo: null, cover: null);
        var withoutImages = await GetJsonAsync(client, "/api/v1/public/restaurants/restaurant-a");
        withoutImages.GetProperty("logoUrl").ValueKind.Should().Be(JsonValueKind.Null);
        withoutImages.GetProperty("coverImageUrl").ValueKind.Should().Be(JsonValueKind.Null);

        await SetBrandingFilesAsync(logo: TestDataSeeder.RestaurantAMediaId, cover: TestDataSeeder.RestaurantAMediaId);
        try
        {
            var restaurant = await GetJsonAsync(client, "/api/v1/public/restaurants/restaurant-a");
            var menu = await GetJsonAsync(client, "/api/v1/public/restaurants/restaurant-a/menu");

            restaurant.GetProperty("logoUrl").GetString().Should().Be("/uploads/test/menu-item-a-stored.png");
            restaurant.GetProperty("coverImageUrl").GetString().Should().Be("/uploads/test/menu-item-a-stored.png");
            restaurant.GetProperty("logoUrl").GetString().Should().Be(GetMenuRestaurant(menu).GetProperty("logoUrl").GetString());
            restaurant.GetProperty("coverImageUrl").GetString()
                .Should().Be(GetMenuRestaurant(menu).GetProperty("coverImageUrl").GetString());
        }
        finally
        {
            await SetBrandingFilesAsync(logo: null, cover: null);
        }
    }

    // ───────────────────────────── helpers ─────────────────────────────

    private static JsonElement GetMenuRestaurant(JsonElement menu) =>
        menu.TryGetProperty("restaurant", out var nested) ? nested : menu;

    private async Task SetBrandingFilesAsync(Guid? logo, Guid? cover)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var restaurant = await db.Restaurants.SingleAsync(r => r.Id == TestDataSeeder.RestaurantAId);
        restaurant.LogoFileId = logo;
        restaurant.CoverImageFileId = cover;
        await db.SaveChangesAsync();
    }

    private async Task<int> CountOrdersAsync(string guestName)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await db.Orders.CountAsync(o => o.GuestName == guestName);
    }

    private static object Item(int quantity) =>
        new { MenuItemId = TestDataSeeder.MenuItemAId, Quantity = quantity };

    private static string OrdersUrl() => "/api/v1/public/restaurants/restaurant-a/orders";

    private static async Task<HttpResponseMessage> PostPickupAsync(
        HttpClient client,
        string guestName,
        string phone = "+15550101010",
        int quantity = 1,
        string? idempotencyKey = null,
        string? headerKey = null)
    {
        using var message = new HttpRequestMessage(HttpMethod.Post, OrdersUrl())
        {
            Content = JsonContent.Create(new
            {
                GuestName = guestName,
                GuestPhone = phone,
                OrderType = OrderType.Pickup,
                IdempotencyKey = idempotencyKey,
                Items = new[] { Item(quantity) }
            })
        };

        if (headerKey is not null)
        {
            message.Headers.Add("Idempotency-Key", headerKey);
        }

        return await client.SendAsync(message);
    }

    private static object RestaurantPayload(
        string? countryCode = null,
        string? phoneCountryCode = null,
        string? email = null,
        string? city = null,
        bool includeNewFields = true)
    {
        if (!includeNewFields)
        {
            return new
            {
                Slug = "restaurant-a",
                NameAr = "مطعم أ",
                NameEn = "Restaurant A",
                PhoneNumber = "+1111111111",
                AccentColor = "#B8663F"
            };
        }

        return new
        {
            Slug = "restaurant-a",
            NameAr = "مطعم أ",
            NameEn = "Restaurant A",
            PhoneNumber = "+1111111111",
            AccentColor = "#B8663F",
            CountryCode = countryCode,
            PhoneCountryCode = phoneCountryCode,
            Email = email,
            City = city
        };
    }

    private static object SettingsPayload(string timeZone) =>
        new
        {
            CurrencyCode = "SAR",
            TimeZone = timeZone,
            TaxRate = 15m,
            DeliveryFee = 0m,
            MinimumOrderAmount = 0m,
            IsDeliveryEnabled = true,
            IsPickupEnabled = true,
            WorkingHoursJson = (string?)null
        };

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(text).RootElement.Clone();
    }

    private static async Task<JsonElement> GetJsonAsync(HttpClient client, string url)
    {
        var response = await client.GetAsync(url);
        response.StatusCode.Should().Be(HttpStatusCode.OK, because: $"GET {url} should succeed");
        return await ReadJsonAsync(response);
    }

    private static async Task AuthenticateAsync(HttpClient client, string email)
    {
        var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { Email = email, Password = TestDataSeeder.CorrectPassword });
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

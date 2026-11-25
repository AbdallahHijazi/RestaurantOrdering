using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;
using RestaurantOrdering.Application.Features.Orders.DTOs;
using RestaurantOrdering.Application.Features.PublicMenu.DTOs;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class MenuItemSizesTests : IClassFixture<TestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly TestWebApplicationFactory _factory;

    public MenuItemSizesTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task SizesFlow_ValidatesOwnershipAndSnapshotsAuthoritativePrice()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var admin = _factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        using var guest = _factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        using var login = await admin.PostAsJsonAsync("/api/v1/auth/login", new
        {
            Email = TestDataSeeder.OwnerAEmail,
            Password = TestDataSeeder.CorrectPassword
        });
        login.EnsureSuccessStatusCode();
        var credentials = await ReadAsync<JsonElement>(login);
        admin.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", credentials.GetProperty("accessToken").GetString());

        var restaurant = $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}";
        var catalog = $"{restaurant}/catalog/menu-items";
        const string publicRestaurant = "/api/v1/public/restaurants/restaurant-a";
        var small = new MenuItemSize(null, "Small", 8m, true, 2);
        var large = new MenuItemSize(null, "Large", 16m, true, 1);

        (await admin.PostAsJsonAsync(catalog, Item(true, [small, large with { Name = " sMaLl " }]))).StatusCode
            .Should().Be(HttpStatusCode.Conflict);
        (await admin.PostAsJsonAsync(catalog, Item(true, [small, large with { Price = 1.001m }]))).StatusCode
            .Should().Be(HttpStatusCode.Conflict);
        (await admin.PostAsJsonAsync(catalog, Item(true, [small]))).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await admin.PostAsJsonAsync(catalog, Item(true, [small with { IsAvailable = false }, large with { IsAvailable = false }]))).StatusCode
            .Should().Be(HttpStatusCode.Conflict);

        var single = await ReadAsync<MenuItemDto>(await admin.PostAsJsonAsync(catalog, Item(null, null)));
        single.UsesSizes.Should().BeFalse();
        var item = await ReadAsync<MenuItemDto>(await admin.PostAsJsonAsync(catalog, Item(true, [small, large])));
        var other = await ReadAsync<MenuItemDto>(await admin.PostAsJsonAsync(catalog, Item(true, [small, large])));
        var sizes = item.Sizes!;
        sizes.Select(size => size.Name).Should().Equal("Large", "Small");

        var publicMenu = await ReadAsync<PublicMenuDto>(await guest.GetAsync($"{publicRestaurant}/menu"));
        var publicItem = publicMenu.Categories.SelectMany(category => category.Items).Single(option => option.Id == item.Id);
        publicItem.Sizes.Should().BeEquivalentTo(sizes);

        async Task<HttpResponseMessage> Order(Guid menuItemId, Guid? sizeId, string slug = "restaurant-a") =>
            await guest.PostAsJsonAsync($"/api/v1/public/restaurants/{slug}/orders", new
            {
                GuestName = "Size Guest",
                GuestPhone = "+15550101010",
                OrderType = OrderType.Pickup,
                Items = new[] { new { MenuItemId = menuItemId, MenuItemSizeId = sizeId, Quantity = 2, UnitPrice = 0.01m } },
                Subtotal = 0.02m
            });

        (await Order(item.Id, other.Sizes![0].Id)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await Order(item.Id, null)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await Order(item.Id, sizes[0].Id, "restaurant-b")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await Order(single.Id, sizes[0].Id)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await ReadAsync<PublicOrderConfirmationDto>(await Order(single.Id, null))).Subtotal.Should().Be(14m);

        var order = await ReadAsync<PublicOrderConfirmationDto>(await Order(item.Id, sizes[0].Id));
        order.Subtotal.Should().Be(32m);
        order.Items.Single().MenuItemSizeId.Should().Be(sizes[0].Id);
        order.Items.Single().SizeName.Should().Be("Large");
        order.Items.Single().DisplayedItemName.Should().EndWith("Large");

        var edited = await ReadAsync<MenuItemDto>(await admin.PutAsJsonAsync($"{catalog}/{item.Id}", Item(true,
        [
            sizes[0] with { Name = "Family", Price = 20m, IsAvailable = false, DisplayOrder = 3 },
            sizes[1] with { DisplayOrder = 0 }
        ])));
        edited.Sizes!.Select(size => size.Name).Should().Equal("Small", "Family");
        edited.Sizes![1].Price.Should().Be(20m);
        edited.Sizes![1].Id.Should().Be(sizes[0].Id);
        (await Order(item.Id, sizes[0].Id)).StatusCode.Should().Be(HttpStatusCode.Conflict);

        var converted = await ReadAsync<MenuItemDto>(await admin.PutAsJsonAsync($"{catalog}/{item.Id}", Item(false, null)));
        converted.UsesSizes.Should().BeFalse();
        converted.Sizes.Should().BeEquivalentTo(edited.Sizes);
        (await Order(item.Id, sizes[1].Id)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await ReadAsync<PublicOrderConfirmationDto>(await Order(item.Id, null))).Subtotal.Should().Be(14m);

        var details = await ReadAsync<OrderDetailsDto>(await admin.GetAsync($"{restaurant}/orders/{order.OrderId}"));
        details.Items.Single().DisplayedItemName.Should().EndWith("Large");
        details.Items.Single().SizeName.Should().Be("Large");
        details.Items.Single().MenuItemSizeId.Should().Be(sizes[0].Id);
        details.Items.Single().UnitPrice.Should().Be(16m);
        details.Items.Single().TotalPrice.Should().Be(32m);
    }

    [Fact]
    public async Task DiscountedSizesRequirePriceConfirmationAndPreserveOrderSnapshots()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var admin = _factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        using var guest = _factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        var auth = await ReadAsync<JsonElement>(await admin.PostAsJsonAsync("/api/v1/auth/login", new
        {
            Email = TestDataSeeder.OwnerAEmail, Password = TestDataSeeder.CorrectPassword
        }));
        admin.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.GetProperty("accessToken").GetString());

        var restaurant = $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}";
        var catalog = $"{restaurant}/catalog/menu-items";
        const string publicRestaurant = "/api/v1/public/restaurants/restaurant-a";
        var small = new MenuItemSize(null, "Regular", 5m, true, 1, new MenuDiscount(MenuDiscountType.Percentage, 100m));
        var large = new MenuItemSize(null, "Double", 10m, true, 2, new MenuDiscount(MenuDiscountType.FixedAmount, 2m));

        object Config(SizeDiscountMode mode, MenuDiscount? uniform, params MenuItemSize[] sizes) => new
        {
            CategoryId = TestDataSeeder.CategoryAId,
            Name = "Discount verification",
            Price = 3m,
            IsAvailable = true,
            IsActive = true,
            UsesSizes = true,
            Sizes = sizes,
            SizeDiscountMode = mode,
            UniformDiscount = uniform
        };

        (await admin.PostAsJsonAsync(catalog, Config(SizeDiscountMode.Uniform,
            new MenuDiscount(MenuDiscountType.FixedAmount, 6m), small, large))).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await admin.PostAsJsonAsync(catalog, Config(SizeDiscountMode.Uniform,
            new MenuDiscount(MenuDiscountType.SalePrice, 1m), small, large))).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await admin.PostAsJsonAsync(catalog, Config(SizeDiscountMode.Individual, null,
            small with { Discount = new MenuDiscount(MenuDiscountType.Percentage, -1m) }, large))).StatusCode
            .Should().Be(HttpStatusCode.Conflict);

        var item = await ReadAsync<MenuItemDto>(await admin.PostAsJsonAsync(catalog,
            Config(SizeDiscountMode.Individual, null, small, large)));
        var sizes = item.Sizes!;
        var regularId = sizes[0].Id!.Value;
        var doubleId = sizes[1].Id!.Value;
        var menu = await ReadAsync<PublicMenuDto>(await guest.GetAsync($"{publicRestaurant}/menu?lang=en"));
        var publicItem = menu.Categories.SelectMany(category => category.Items).Single(entry => entry.Id == item.Id);
        publicItem.SizePrices![regularId].FinalPrice.Should().Be(0m);
        publicItem.SizePrices[doubleId].FinalPrice.Should().Be(8m);

        Task<HttpResponseMessage> Order(string key, params (Guid Size, decimal Expected, int Quantity)[] lines) =>
            guest.PostAsJsonAsync($"{publicRestaurant}/orders", new
            {
                GuestName = "Discount Guest",
                GuestPhone = "+15550101010",
                OrderType = OrderType.Pickup,
                IdempotencyKey = key,
                Items = lines.Select(line => new { MenuItemId = item.Id, MenuItemSizeId = line.Size,
                    ExpectedUnitPrice = line.Expected, line.Quantity, UnitPrice = .01m }),
                Subtotal = .01m
            });

        (await Order("duplicate-line", (regularId, 0m, 1), (regularId, 0m, 2))).StatusCode
            .Should().Be(HttpStatusCode.BadRequest);
        var free = await ReadAsync<PublicOrderConfirmationDto>(await Order("free-size", (regularId, 0m, 1)));
        free.Subtotal.Should().Be(0m);
        free.Items.Single().UnitPrice.Should().Be(0m);
        var paid = await ReadAsync<PublicOrderConfirmationDto>(await Order("two-sizes", (regularId, 0m, 2), (doubleId, 8m, 3)));
        paid.Subtotal.Should().Be(24m);
        paid.Items.Select(line => line.MenuItemSizeId).Should().BeEquivalentTo(new Guid?[] { regularId, doubleId });
        paid.Items.Single(line => line.MenuItemSizeId == doubleId).Quantity.Should().Be(3);

        var uniform = new MenuDiscount(MenuDiscountType.Percentage, 10m);
        var updated = await ReadAsync<MenuItemDto>(await admin.PutAsJsonAsync($"{catalog}/{item.Id}",
            Config(SizeDiscountMode.Uniform, uniform, sizes.ToArray())));
        updated.SizePrices![regularId].FinalPrice.Should().Be(4.50m);
        updated.SizePrices[doubleId].FinalPrice.Should().Be(9m);
        using var stale = await Order("needs-confirmation", (regularId, 0m, 2), (doubleId, 8m, 3));
        stale.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var problem = await stale.Content.ReadFromJsonAsync<JsonElement>();
        var corrections = problem.GetProperty("updatedPrices").EnumerateArray().ToArray();
        corrections.Should().HaveCount(2);
        corrections.Single(price => price.GetProperty("menuItemSizeId").GetGuid() == regularId)
            .GetProperty("finalPrice").GetDecimal().Should().Be(4.50m);

        // Reuse the rejected key with revised prices to prove the conflict persisted neither an order nor a claim.
        var confirmed = await ReadAsync<PublicOrderConfirmationDto>(await Order(
            "needs-confirmation", (regularId, 4.50m, 2), (doubleId, 9m, 3)));
        confirmed.Subtotal.Should().Be(36m);
        var historical = await ReadAsync<OrderDetailsDto>(await admin.GetAsync($"{restaurant}/orders/{paid.OrderId}"));
        historical.Subtotal.Should().Be(24m);
        var line = historical.Items.Single(entry => entry.MenuItemSizeId == doubleId);
        line.BaseUnitPrice.Should().Be(10m);
        line.UnitDiscountAmount.Should().Be(2m);
        line.AppliedDiscountType.Should().Be(MenuDiscountType.FixedAmount);
        line.UnitPrice.Should().Be(8m);
        line.TotalPrice.Should().Be(24m);
    }

    private static object Item(bool? usesSizes, IReadOnlyList<MenuItemSize>? sizes) => new
    {
        CategoryId = TestDataSeeder.CategoryAId,
        Name = "Size test item",
        Price = 7m,
        IsAvailable = true,
        IsActive = true,
        UsesSizes = usesSizes,
        Sizes = sizes
    };

    private static async Task<T> ReadAsync<T>(HttpResponseMessage response)
    {
        using (response)
        {
            var body = await response.Content.ReadAsStringAsync();
            response.IsSuccessStatusCode.Should().BeTrue("HTTP {0}: {1}", response.StatusCode, body);
            return JsonSerializer.Deserialize<T>(body, JsonOptions)!;
        }
    }
}

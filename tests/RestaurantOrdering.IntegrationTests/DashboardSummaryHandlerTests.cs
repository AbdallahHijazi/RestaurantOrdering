using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.Orders.Queries.GetDashboardSummary;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Persistence;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

/// <summary>
/// BUG-001 / BUG-002: the dashboard aggregates are computed from the whole dataset (never from a page),
/// per restaurant, in the restaurant's currency and time zone, with controlled data.
/// </summary>
public sealed class DashboardSummaryHandlerTests
{
    private static readonly Guid RestaurantId = Guid.Parse("11111111-aaaa-aaaa-aaaa-000000000001");
    private static readonly Guid OtherRestaurantId = Guid.Parse("22222222-bbbb-bbbb-bbbb-000000000002");

    // 2026-11-15 12:00 UTC — noon, far from any day boundary in the zones used below.
    private static readonly DateTime Now = new(2026, 11, 15, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task NoOrders_ReturnsGenuineZeros_WithTheRestaurantCurrency()
    {
        await using var db = CreateContext(currency: "JOD");

        var summary = await HandleAsync(db);

        summary.TodayOrders.Should().Be(0);
        summary.ActiveOrders.Should().Be(0);
        summary.TodaySales.Should().Be(0m);
        summary.AverageOrderValue.Should().Be(0m);
        summary.CurrencyCode.Should().Be("JOD");
    }

    [Theory]
    [InlineData(3)]
    [InlineData(5)]
    [InlineData(6)]
    [InlineData(23)]
    public async Task OrderCount_IsIndependentOfAnyPageSize(int count)
    {
        await using var db = CreateContext();
        for (var i = 0; i < count; i++)
        {
            AddOrder(db, OrderStatus.New, 10m, Now.AddMinutes(-i));
        }

        await db.SaveChangesAsync();
        var summary = await HandleAsync(db);

        summary.TodayOrders.Should().Be(count);
        summary.ActiveOrders.Should().Be(count);
        summary.TodaySales.Should().Be(10m * count);
        summary.AverageOrderValue.Should().Be(10m);
    }

    [Fact]
    public async Task MixedStatuses_ClassifyActiveCancelledAndSalesCorrectly()
    {
        await using var db = CreateContext();
        AddOrder(db, OrderStatus.New, 10m, Now.AddMinutes(-1));
        AddOrder(db, OrderStatus.Preparing, 20m, Now.AddMinutes(-2));
        AddOrder(db, OrderStatus.Ready, 30m, Now.AddMinutes(-3));
        AddOrder(db, OrderStatus.Completed, 40m, Now.AddMinutes(-4));
        AddOrder(db, OrderStatus.Completed, 50m, Now.AddMinutes(-5));
        AddOrder(db, OrderStatus.Cancelled, 1000m, Now.AddMinutes(-6));
        AddOrder(db, OrderStatus.Cancelled, 2000m, Now.AddMinutes(-7));
        await db.SaveChangesAsync();

        var summary = await HandleAsync(db);

        summary.TodayOrders.Should().Be(7);
        summary.TodayCancelledOrders.Should().Be(2);
        summary.ActiveOrders.Should().Be(3);
        summary.TodaySales.Should().Be(150m);          // cancelled orders are never sales
        summary.AverageOrderValue.Should().Be(30m);    // 150 / 5 billable orders
    }

    [Fact]
    public async Task OrdersOfOtherDays_DoNotCountAsToday_ButOpenOnesStillCountAsActive()
    {
        await using var db = CreateContext();
        AddOrder(db, OrderStatus.Completed, 10m, Now.AddHours(-1));
        AddOrder(db, OrderStatus.Completed, 999m, Now.AddDays(-1));           // yesterday
        AddOrder(db, OrderStatus.Preparing, 888m, Now.AddDays(-1));           // yesterday, still open
        AddOrder(db, OrderStatus.Completed, 777m, Now.AddDays(1));            // tomorrow
        await db.SaveChangesAsync();

        var summary = await HandleAsync(db);

        summary.TodayOrders.Should().Be(1);
        summary.TodaySales.Should().Be(10m);
        summary.ActiveOrders.Should().Be(1);
    }

    [Fact]
    public async Task OtherRestaurantsOrders_AreNeverIncluded()
    {
        await using var db = CreateContext();
        AddOrder(db, OrderStatus.New, 10m, Now);
        AddOrder(db, OrderStatus.New, 500m, Now, restaurantId: OtherRestaurantId);
        await db.SaveChangesAsync();

        var summary = await HandleAsync(db);

        summary.TodayOrders.Should().Be(1);
        summary.TodaySales.Should().Be(10m);
        summary.ActiveOrders.Should().Be(1);
    }

    [Fact]
    public async Task DayBoundaries_FollowTheRestaurantTimeZone()
    {
        // Amman is UTC+3 in November 2026 (no DST then): local day = 2026-11-15 00:00+03 … 2026-11-16 00:00+03
        // = 2026-11-14 21:00Z … 2026-11-15 21:00Z.
        await using var db = CreateContext(timeZone: "Asia/Amman");
        AddOrder(db, OrderStatus.Completed, 10m, new DateTime(2026, 11, 14, 21, 30, 0, DateTimeKind.Utc)); // today (local)
        AddOrder(db, OrderStatus.Completed, 20m, new DateTime(2026, 11, 15, 20, 30, 0, DateTimeKind.Utc)); // today (local)
        AddOrder(db, OrderStatus.Completed, 99m, new DateTime(2026, 11, 14, 20, 30, 0, DateTimeKind.Utc)); // yesterday (local)
        AddOrder(db, OrderStatus.Completed, 77m, new DateTime(2026, 11, 15, 21, 30, 0, DateTimeKind.Utc)); // tomorrow (local)
        await db.SaveChangesAsync();

        var summary = await HandleAsync(db, new DateTime(2026, 11, 15, 12, 0, 0, DateTimeKind.Utc));

        summary.TodayOrders.Should().Be(2);
        summary.TodaySales.Should().Be(30m);
        summary.TimeZone.Should().Be("Asia/Amman");
        summary.DayStartUtc.Should().Be(new DateTime(2026, 11, 14, 21, 0, 0, DateTimeKind.Utc));
        summary.DayEndUtc.Should().Be(new DateTime(2026, 11, 15, 21, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public async Task UnknownTimeZone_FallsBackToUtcInsteadOfFailing()
    {
        await using var db = CreateContext(timeZone: "Not/AZone");
        AddOrder(db, OrderStatus.Completed, 10m, Now);
        await db.SaveChangesAsync();

        var summary = await HandleAsync(db);

        summary.TimeZone.Should().Be("UTC");
        summary.TodayOrders.Should().Be(1);
        summary.DayStartUtc.Should().Be(new DateTime(2026, 11, 15, 0, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public async Task OrdersInAnotherCurrency_DoNotContributeToSales()
    {
        await using var db = CreateContext(currency: "JOD");
        AddOrder(db, OrderStatus.Completed, 10m, Now, currency: "JOD");
        AddOrder(db, OrderStatus.Completed, 500m, Now, currency: "USD");
        await db.SaveChangesAsync();

        var summary = await HandleAsync(db);

        summary.TodayOrders.Should().Be(2);
        summary.TodaySales.Should().Be(10m);
        summary.AverageOrderValue.Should().Be(10m);
    }

    [Fact]
    public async Task MissingSettings_ThrowsNotFound()
    {
        await using var db = CreateContext(withSettings: false);

        var act = () => HandleAsync(db);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    private static Task<RestaurantOrdering.Application.Features.Orders.DTOs.DashboardSummaryDto> HandleAsync(
        ApplicationDbContext db,
        DateTime? now = null) =>
        new GetDashboardSummaryQueryHandler(db, new FixedClock(now ?? Now))
            .Handle(new GetDashboardSummaryQuery(RestaurantId), CancellationToken.None);

    private static void AddOrder(
        ApplicationDbContext db,
        OrderStatus status,
        decimal total,
        DateTime createdAtUtc,
        Guid? restaurantId = null,
        string currency = "SAR") =>
        db.Orders.Add(new Order
        {
            Id = Guid.NewGuid(),
            RestaurantId = restaurantId ?? RestaurantId,
            OrderNumber = $"ORD-{Guid.NewGuid():N}"[..16],
            OrderType = OrderType.Pickup,
            OrderStatus = status,
            Subtotal = total,
            TotalAmount = total,
            CurrencyCode = currency,
            CreatedAt = createdAtUtc
        });

    private static ApplicationDbContext CreateContext(
        string currency = "SAR",
        string timeZone = "UTC",
        bool withSettings = true)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"dashboard-summary-{Guid.NewGuid()}")
            .Options;
        var db = new ApplicationDbContext(options);

        // RestaurantSettings is filtered by its restaurant (required end of the relationship).
        db.Restaurants.AddRange(
            new Restaurant
            {
                Id = RestaurantId,
                OwnerId = Guid.NewGuid(),
                Slug = "dashboard-a",
                NameAr = "أ",
                PhoneNumber = "+15550000001",
                CreatedAt = Now
            },
            new Restaurant
            {
                Id = OtherRestaurantId,
                OwnerId = Guid.NewGuid(),
                Slug = "dashboard-b",
                NameAr = "ب",
                PhoneNumber = "+15550000002",
                CreatedAt = Now
            });

        if (withSettings)
        {
            db.RestaurantSettings.Add(new RestaurantSettings
            {
                Id = Guid.NewGuid(),
                RestaurantId = RestaurantId,
                CurrencyCode = currency,
                TimeZone = timeZone,
                CreatedAt = Now
            });
            db.SaveChanges();
        }

        return db;
    }

    private sealed class FixedClock(DateTime utcNow) : IDateTimeService
    {
        public DateTime UtcNow { get; } = utcNow;
    }
}

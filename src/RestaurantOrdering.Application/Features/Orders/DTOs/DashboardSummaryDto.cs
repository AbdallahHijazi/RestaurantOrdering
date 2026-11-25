namespace RestaurantOrdering.Application.Features.Orders.DTOs;

/// <summary>
/// Authoritative, server-computed dashboard aggregates for a single restaurant.
/// "Today" is the current calendar day in the restaurant's configured time zone.
/// </summary>
public class DashboardSummaryDto
{
    public Guid RestaurantId { get; init; }

    /// <summary>ISO 4217 currency of the restaurant (monetary values are expressed in it).</summary>
    public string CurrencyCode { get; init; } = string.Empty;

    /// <summary>Time zone that defined the day boundaries (falls back to UTC when invalid).</summary>
    public string TimeZone { get; init; } = "UTC";

    public DateTime DayStartUtc { get; init; }
    public DateTime DayEndUtc { get; init; }

    /// <summary>All orders created today, including cancelled ones.</summary>
    public int TodayOrders { get; init; }

    /// <summary>Orders created today that were cancelled (excluded from sales figures).</summary>
    public int TodayCancelledOrders { get; init; }

    /// <summary>Orders currently New, Preparing or Ready (regardless of creation day).</summary>
    public int ActiveOrders { get; init; }

    /// <summary>Sum of today's non-cancelled orders expressed in <see cref="CurrencyCode"/>.</summary>
    public decimal TodaySales { get; init; }

    /// <summary><see cref="TodaySales"/> divided by today's non-cancelled order count (0 when none).</summary>
    public decimal AverageOrderValue { get; init; }
}

namespace RestaurantOrdering.Application.Features.Orders.DTOs;

/// <summary>Per-day order activity for the last N calendar days (restaurant time zone), oldest first.</summary>
public class DashboardActivityDto
{
    public Guid RestaurantId { get; init; }
    public string CurrencyCode { get; init; } = string.Empty;
    public string TimeZone { get; init; } = "UTC";
    public IReadOnlyList<DashboardActivityDayDto> Days { get; init; } = Array.Empty<DashboardActivityDayDto>();
}

public class DashboardActivityDayDto
{
    /// <summary>Calendar day in the restaurant time zone (yyyy-MM-dd).</summary>
    public string Date { get; init; } = string.Empty;
    /// <summary>All orders created that day, including cancelled ones.</summary>
    public int Orders { get; init; }
    public int CancelledOrders { get; init; }
    /// <summary>Sum of non-cancelled orders in the restaurant currency.</summary>
    public decimal Sales { get; init; }
}

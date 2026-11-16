using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.Orders.DTOs;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Orders.Queries.GetDashboardSummary;

public sealed class GetDashboardSummaryQueryHandler
    : IRequestHandler<GetDashboardSummaryQuery, DashboardSummaryDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public GetDashboardSummaryQueryHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<DashboardSummaryDto> Handle(
        GetDashboardSummaryQuery request,
        CancellationToken cancellationToken)
    {
        var settings = await _context.RestaurantSettings
            .AsNoTracking()
            .Where(s => s.RestaurantId == request.RestaurantId)
            .Select(s => new { s.CurrencyCode, s.TimeZone })
            .FirstOrDefaultAsync(cancellationToken);

        if (settings is null)
        {
            throw new NotFoundException("RestaurantSettings", request.RestaurantId);
        }

        var utcNow = _dateTimeService.UtcNow;
        var (timeZoneId, dayStartUtc, dayEndUtc) = ResolveDayBoundsUtc(settings.TimeZone, utcNow);
        var currencyCode = settings.CurrencyCode;

        // One grouped query for today's orders (status -> count, sum), all computed in the database.
        var todayByStatus = await _context.Orders
            .AsNoTracking()
            .Where(o =>
                o.RestaurantId == request.RestaurantId &&
                o.CreatedAt >= dayStartUtc &&
                o.CreatedAt < dayEndUtc)
            .GroupBy(o => o.OrderStatus)
            .Select(g => new
            {
                Status = g.Key,
                Count = g.Count(),
                // Only orders expressed in the restaurant currency contribute to sales.
                Sales = g.Where(o => o.CurrencyCode == currencyCode)
                    .Sum(o => (decimal?)o.TotalAmount) ?? 0m,
                SalesCount = g.Count(o => o.CurrencyCode == currencyCode)
            })
            .ToListAsync(cancellationToken);

        var activeOrders = await _context.Orders
            .AsNoTracking()
            .CountAsync(
                o => o.RestaurantId == request.RestaurantId &&
                     (o.OrderStatus == OrderStatus.New ||
                      o.OrderStatus == OrderStatus.Preparing ||
                      o.OrderStatus == OrderStatus.Ready),
                cancellationToken);

        var todayOrders = todayByStatus.Sum(row => row.Count);
        var cancelled = todayByStatus
            .Where(row => row.Status == OrderStatus.Cancelled)
            .Sum(row => row.Count);

        var billable = todayByStatus.Where(row => row.Status != OrderStatus.Cancelled).ToList();
        var todaySales = billable.Sum(row => row.Sales);
        var billableCount = billable.Sum(row => row.SalesCount);

        var average = billableCount == 0
            ? 0m
            : Math.Round(todaySales / billableCount, 2, MidpointRounding.AwayFromZero);

        return new DashboardSummaryDto
        {
            RestaurantId = request.RestaurantId,
            CurrencyCode = currencyCode,
            TimeZone = timeZoneId,
            DayStartUtc = dayStartUtc,
            DayEndUtc = dayEndUtc,
            TodayOrders = todayOrders,
            TodayCancelledOrders = cancelled,
            ActiveOrders = activeOrders,
            TodaySales = todaySales,
            AverageOrderValue = average
        };
    }

    /// <summary>
    /// Returns the UTC instants delimiting the current calendar day in the restaurant time zone.
    /// An unknown/invalid time-zone id falls back to UTC rather than failing the dashboard.
    /// </summary>
    internal static (string TimeZoneId, DateTime DayStartUtc, DateTime DayEndUtc) ResolveDayBoundsUtc(
        string? configuredTimeZoneId,
        DateTime utcNow)
    {
        TimeZoneInfo zone;
        var resolvedId = "UTC";

        if (!string.IsNullOrWhiteSpace(configuredTimeZoneId) &&
            TimeZoneInfo.TryFindSystemTimeZoneById(configuredTimeZoneId.Trim(), out var found))
        {
            zone = found;
            resolvedId = configuredTimeZoneId.Trim();
        }
        else
        {
            zone = TimeZoneInfo.Utc;
        }

        var utc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(utc, zone);
        var localStart = localNow.Date;

        var startUtc = ConvertLocalMidnightToUtc(localStart, zone);
        var endUtc = ConvertLocalMidnightToUtc(localStart.AddDays(1), zone);

        return (resolvedId, startUtc, endUtc);
    }

    internal static DateTime ToUtcStartOfLocalDay(DateTime localMidnight, TimeZoneInfo zone) =>
        ConvertLocalMidnightToUtc(localMidnight, zone);

    private static DateTime ConvertLocalMidnightToUtc(DateTime localMidnight, TimeZoneInfo zone)
    {
        var unspecified = DateTime.SpecifyKind(localMidnight, DateTimeKind.Unspecified);

        // Midnight may not exist (DST gap) or be ambiguous; pick the first valid instant of the day.
        if (zone.IsInvalidTime(unspecified))
        {
            unspecified = unspecified.AddHours(1);
        }

        return TimeZoneInfo.ConvertTimeToUtc(unspecified, zone);
    }
}

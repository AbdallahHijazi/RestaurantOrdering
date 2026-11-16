using System.Globalization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.Orders.DTOs;
using RestaurantOrdering.Application.Features.Orders.Queries.GetDashboardSummary;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Orders.Queries.GetDashboardActivity;

public sealed class GetDashboardActivityQueryHandler
    : IRequestHandler<GetDashboardActivityQuery, DashboardActivityDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public GetDashboardActivityQueryHandler(IApplicationDbContext context, IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<DashboardActivityDto> Handle(
        GetDashboardActivityQuery request,
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

        var (timeZoneId, todayStartUtc, _) =
            GetDashboardSummaryQueryHandler.ResolveDayBoundsUtc(settings.TimeZone, _dateTimeService.UtcNow);
        var zone = timeZoneId == "UTC" ? TimeZoneInfo.Utc : TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);

        var todayLocal = TimeZoneInfo.ConvertTimeFromUtc(todayStartUtc, zone).Date;
        var firstLocal = todayLocal.AddDays(-(request.Days - 1));
        var rangeStartUtc = GetDashboardSummaryQueryHandler.ToUtcStartOfLocalDay(firstLocal, zone);
        var rangeEndUtc = GetDashboardSummaryQueryHandler.ToUtcStartOfLocalDay(todayLocal.AddDays(1), zone);
        var currency = settings.CurrencyCode;

        // Only three small columns for at most a month of orders; bucketed by local calendar day below.
        var rows = await _context.Orders
            .AsNoTracking()
            .Where(o =>
                o.RestaurantId == request.RestaurantId &&
                o.CreatedAt >= rangeStartUtc &&
                o.CreatedAt < rangeEndUtc)
            .Select(o => new { o.CreatedAt, o.OrderStatus, o.TotalAmount, o.CurrencyCode })
            .ToListAsync(cancellationToken);

        var byDay = rows
            .GroupBy(r => TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.SpecifyKind(r.CreatedAt, DateTimeKind.Utc), zone).Date)
            .ToDictionary(g => g.Key, g => g.ToList());

        var days = Enumerable.Range(0, request.Days)
            .Select(offset =>
            {
                var day = firstLocal.AddDays(offset);
                byDay.TryGetValue(day, out var dayRows);
                dayRows ??= [];

                return new DashboardActivityDayDto
                {
                    Date = day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    Orders = dayRows.Count,
                    CancelledOrders = dayRows.Count(r => r.OrderStatus == OrderStatus.Cancelled),
                    Sales = dayRows
                        .Where(r => r.OrderStatus != OrderStatus.Cancelled && r.CurrencyCode == currency)
                        .Sum(r => r.TotalAmount)
                };
            })
            .ToList();

        return new DashboardActivityDto
        {
            RestaurantId = request.RestaurantId,
            CurrencyCode = currency,
            TimeZone = timeZoneId,
            Days = days
        };
    }
}

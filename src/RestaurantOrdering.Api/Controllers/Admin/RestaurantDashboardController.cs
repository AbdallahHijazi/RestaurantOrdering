using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Orders.DTOs;
using RestaurantOrdering.Application.Features.Orders.Queries.GetDashboardActivity;
using RestaurantOrdering.Application.Features.Orders.Queries.GetDashboardSummary;

namespace RestaurantOrdering.Api.Controllers.Admin;

[ApiController]
[Authorize(Policy = ApplicationPolicies.RestaurantDashboardAccess)]
[Route("api/v1/admin/restaurants/{restaurantId:guid}/dashboard")]
public sealed class RestaurantDashboardController : ControllerBase
{
    private readonly ISender _sender;

    public RestaurantDashboardController(ISender sender)
    {
        _sender = sender;
    }

    /// <summary>
    /// Server-side aggregates (today's orders, active orders, sales, average order value)
    /// computed over the full dataset instead of a paginated subset.
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(DashboardSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary(
        Guid restaurantId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new GetDashboardSummaryQuery(restaurantId), cancellationToken);
        return Ok(result);
    }

    /// <summary>Real per-day order counts and sales for the last N days (default 7) — no sample data.</summary>
    [HttpGet("activity")]
    [ProducesResponseType(typeof(DashboardActivityDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DashboardActivityDto>> GetActivity(
        Guid restaurantId,
        [FromQuery] int days = 7,
        CancellationToken cancellationToken = default)
    {
        var result = await _sender.Send(new GetDashboardActivityQuery(restaurantId, days), cancellationToken);
        return Ok(result);
    }
}

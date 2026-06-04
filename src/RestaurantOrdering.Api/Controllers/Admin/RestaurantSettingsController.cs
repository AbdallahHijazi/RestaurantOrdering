using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantOrdering.Api.Contracts.Admin.Restaurants;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.RestaurantSettings.Commands.UpdateRestaurantSettings;
using RestaurantOrdering.Application.Features.RestaurantSettings.DTOs;
using RestaurantOrdering.Application.Features.RestaurantSettings.Queries.GetRestaurantSettings;

namespace RestaurantOrdering.Api.Controllers.Admin;

[ApiController]
[Authorize(Policy = ApplicationPolicies.RestaurantOwnerOnly)]
[Route("api/v1/admin/restaurants/{restaurantId:guid}/settings")]
public sealed class RestaurantSettingsController : ControllerBase
{
    private readonly ISender _sender;

    public RestaurantSettingsController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet]
    [ProducesResponseType(typeof(RestaurantSettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<RestaurantSettingsDto>> Get(
        Guid restaurantId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new GetRestaurantSettingsQuery(restaurantId), cancellationToken);
        return Ok(result);
    }

    [HttpPut]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(RestaurantSettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<RestaurantSettingsDto>> Update(
        Guid restaurantId,
        [FromBody] UpdateRestaurantSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateRestaurantSettingsCommand(
            restaurantId,
            request.CurrencyCode,
            request.TimeZone,
            request.TaxRate,
            request.DeliveryFee,
            request.MinimumOrderAmount,
            request.IsDeliveryEnabled,
            request.IsPickupEnabled,
            request.WorkingHoursJson);

        var result = await _sender.Send(command, cancellationToken);
        return Ok(result);
    }
}

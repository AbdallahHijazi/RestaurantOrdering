using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantOrdering.Api.Contracts.Admin.Restaurants;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Locales.Commands.UpdateRestaurantLocaleSettings;
using RestaurantOrdering.Application.Features.Locales.DTOs;
using RestaurantOrdering.Application.Features.Locales.Queries.GetRestaurantLocaleSettings;

namespace RestaurantOrdering.Api.Controllers.Admin;

[ApiController]
[Authorize(Policy = ApplicationPolicies.RestaurantDashboardAccess)]
[Route("api/v1/admin/restaurants/{restaurantId:guid}/locales")]
public sealed class RestaurantLocalesController : ControllerBase
{
    private readonly ISender _sender;

    public RestaurantLocalesController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet]
    [ProducesResponseType(typeof(RestaurantLocaleSettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<RestaurantLocaleSettingsDto>> Get(
        Guid restaurantId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new GetRestaurantLocaleSettingsQuery(restaurantId), cancellationToken);
        return Ok(result);
    }

    [HttpPut]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(RestaurantLocaleSettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<RestaurantLocaleSettingsDto>> Update(
        Guid restaurantId,
        [FromBody] UpdateRestaurantLocaleSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateRestaurantLocaleSettingsCommand(
            restaurantId,
            request.DefaultLocale,
            request.SupportedLocales
                .Select(item => new UpdateRestaurantSupportedLocaleDto(item.Code, item.IsEnabled, item.SortOrder))
                .ToList(),
            request.TranslationMode);

        var result = await _sender.Send(command, cancellationToken);
        return Ok(result);
    }
}

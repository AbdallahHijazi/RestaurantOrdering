using MediatR;
using Microsoft.AspNetCore.Mvc;
using RestaurantOrdering.Api.Contracts.Admin.Restaurants;
using RestaurantOrdering.Application.Features.Restaurants.Commands.UpdateRestaurant;
using RestaurantOrdering.Application.Features.Restaurants.DTOs;
using RestaurantOrdering.Application.Features.Restaurants.Queries.GetRestaurantById;

namespace RestaurantOrdering.Api.Controllers.Admin;

[ApiController]
[Route("api/v1/admin/restaurants/{restaurantId:guid}")]
public sealed class RestaurantsController : ControllerBase
{
    private readonly ISender _sender;

    public RestaurantsController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet]
    [ProducesResponseType(typeof(RestaurantDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<RestaurantDto>> GetById(
        Guid restaurantId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new GetRestaurantByIdQuery(restaurantId), cancellationToken);
        return Ok(result);
    }

    [HttpPut]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(RestaurantDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<RestaurantDto>> Update(
        Guid restaurantId,
        [FromBody] UpdateRestaurantRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateRestaurantCommand(
            restaurantId,
            request.Slug,
            request.NameAr,
            request.NameEn,
            request.DescriptionAr,
            request.DescriptionEn,
            request.PhoneNumber,
            request.WhatsAppNumber,
            request.AddressAr,
            request.AddressEn,
            request.Latitude,
            request.Longitude);

        var result = await _sender.Send(command, cancellationToken);
        return Ok(result);
    }
}

using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RestaurantOrdering.Api.Contracts.Public;
using RestaurantOrdering.Application.Features.Orders.Commands.CreatePublicOrder;
using RestaurantOrdering.Application.Features.Orders.DTOs;
using ApplicationCreatePublicOrderItemRequest =
    RestaurantOrdering.Application.Features.Orders.Commands.CreatePublicOrder.CreatePublicOrderItemRequest;

namespace RestaurantOrdering.Api.Controllers.Public;

[ApiController]
[AllowAnonymous]
[Route("api/v1/public/restaurants/{slug}/orders")]
public sealed class PublicOrdersController : ControllerBase
{
    private readonly ISender _sender;

    public PublicOrdersController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPost]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [EnableRateLimiting("public-order")]
    [ProducesResponseType(typeof(PublicOrderConfirmationDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<PublicOrderConfirmationDto>> Create(
        string slug,
        [FromBody] CreatePublicOrderRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreatePublicOrderCommand(
            slug,
            request.GuestName,
            request.GuestPhone,
            request.OrderType,
            request.DeliveryAddress,
            request.DeliveryLatitude,
            request.DeliveryLongitude,
            request.Notes,
            request.Items?
                .Select(item => new ApplicationCreatePublicOrderItemRequest(
                    item.MenuItemId,
                    item.Quantity,
                    item.Notes))
                .ToList()
                ?? []);

        var result = await _sender.Send(command, cancellationToken);

        return StatusCode(StatusCodes.Status201Created, result);
    }
}

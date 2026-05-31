using MediatR;
using Microsoft.AspNetCore.Mvc;
using RestaurantOrdering.Api.Contracts.Admin.Orders;
using RestaurantOrdering.Application.Features.Orders.Commands.UpdateOrderStatus;
using RestaurantOrdering.Application.Features.Orders.DTOs;
using RestaurantOrdering.Application.Features.Orders.Queries.GetOrderById;
using RestaurantOrdering.Application.Features.Orders.Queries.GetOrders;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Api.Controllers.Admin;

[ApiController]
[Route("api/v1/admin/restaurants/{restaurantId:guid}/orders")]
public sealed class OrdersController : ControllerBase
{
    private readonly ISender _sender;

    public OrdersController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet]
    [ProducesResponseType(typeof(GetOrdersResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<GetOrdersResultDto>> GetAll(
        Guid restaurantId,
        [FromQuery] OrderStatus? status,
        [FromQuery] OrderType? orderType,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = new GetOrdersQuery(
            restaurantId,
            status,
            orderType,
            fromUtc,
            toUtc,
            searchTerm,
            pageNumber,
            pageSize);

        var result = await _sender.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{orderId:guid}")]
    [ProducesResponseType(typeof(OrderDetailsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<OrderDetailsDto>> GetById(
        Guid restaurantId,
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new GetOrderByIdQuery(restaurantId, orderId), cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{orderId:guid}/status")]
    [Consumes("application/json")]
    [RequestSizeLimit(16384)]
    [ProducesResponseType(typeof(OrderSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<OrderSummaryDto>> UpdateStatus(
        Guid restaurantId,
        Guid orderId,
        [FromBody] UpdateOrderStatusRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateOrderStatusCommand(restaurantId, orderId, request.NewStatus);
        var result = await _sender.Send(command, cancellationToken);
        return Ok(result);
    }
}

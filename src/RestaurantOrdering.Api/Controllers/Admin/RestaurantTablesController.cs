using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantOrdering.Api.Contracts.Admin.Tables;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.RestaurantTables.Commands.CreateRestaurantTable;
using RestaurantOrdering.Application.Features.RestaurantTables.Commands.RegenerateRestaurantTableToken;
using RestaurantOrdering.Application.Features.RestaurantTables.Commands.UpdateRestaurantTable;
using RestaurantOrdering.Application.Features.RestaurantTables.Commands.UpdateRestaurantTableStatus;
using RestaurantOrdering.Application.Features.RestaurantTables.DTOs;
using RestaurantOrdering.Application.Features.RestaurantTables.Queries.GetRestaurantTables;

namespace RestaurantOrdering.Api.Controllers.Admin;

[ApiController]
[Authorize(Policy = ApplicationPolicies.RestaurantOwnerOnly)]
[Route("api/v1/admin/restaurants/{restaurantId:guid}/tables")]
public sealed class RestaurantTablesController : ControllerBase
{
    private readonly ISender _sender;

    public RestaurantTablesController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<RestaurantTableResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RestaurantTableResponse>>> GetAll(
        Guid restaurantId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new GetRestaurantTablesQuery(restaurantId), cancellationToken);
        return Ok(result.Select(MapResponse).ToList());
    }

    [HttpPost]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(RestaurantTableResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<RestaurantTableResponse>> Create(
        Guid restaurantId,
        [FromBody] CreateRestaurantTableRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateRestaurantTableCommand(
            restaurantId,
            request.Name,
            request.Zone,
            request.IsActive);

        var result = await _sender.Send(command, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, MapResponse(result));
    }

    [HttpPatch("{tableId:guid}")]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(RestaurantTableResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<RestaurantTableResponse>> Update(
        Guid restaurantId,
        Guid tableId,
        [FromBody] UpdateRestaurantTableRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateRestaurantTableCommand(
            restaurantId,
            tableId,
            request.Name,
            request.Zone);

        var result = await _sender.Send(command, cancellationToken);
        return Ok(MapResponse(result));
    }

    [HttpPatch("{tableId:guid}/status")]
    [Consumes("application/json")]
    [RequestSizeLimit(16384)]
    [ProducesResponseType(typeof(RestaurantTableResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<RestaurantTableResponse>> UpdateStatus(
        Guid restaurantId,
        Guid tableId,
        [FromBody] UpdateRestaurantTableStatusRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateRestaurantTableStatusCommand(
            restaurantId,
            tableId,
            request.IsActive);

        var result = await _sender.Send(command, cancellationToken);
        return Ok(MapResponse(result));
    }

    [HttpPost("{tableId:guid}/regenerate-token")]
    [ProducesResponseType(typeof(RestaurantTableResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<RestaurantTableResponse>> RegenerateToken(
        Guid restaurantId,
        Guid tableId,
        CancellationToken cancellationToken)
    {
        var command = new RegenerateRestaurantTableTokenCommand(restaurantId, tableId);
        var result = await _sender.Send(command, cancellationToken);
        return Ok(MapResponse(result));
    }

    private static RestaurantTableResponse MapResponse(RestaurantTableDto dto) =>
        new()
        {
            Id = dto.Id,
            Name = dto.Name,
            Zone = dto.Zone,
            PublicToken = dto.PublicToken,
            IsActive = dto.IsActive,
            CreatedAt = dto.CreatedAt,
            UpdatedAt = dto.UpdatedAt
        };
}

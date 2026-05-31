using MediatR;
using Microsoft.AspNetCore.Mvc;
using RestaurantOrdering.Api.Contracts.Admin.QrCodes;
using RestaurantOrdering.Application.Features.QrCodes.Commands.CreateMenuQrCode;
using RestaurantOrdering.Application.Features.QrCodes.Commands.DeactivateMenuQrCode;
using RestaurantOrdering.Application.Features.QrCodes.Commands.UpdateMenuQrCode;
using RestaurantOrdering.Application.Features.QrCodes.DTOs;
using RestaurantOrdering.Application.Features.QrCodes.Queries.GetMenuQrCodeById;
using RestaurantOrdering.Application.Features.QrCodes.Queries.GetMenuQrCodes;

namespace RestaurantOrdering.Api.Controllers.Admin;

[ApiController]
[Route("api/v1/admin/restaurants/{restaurantId:guid}/menu-qr-codes")]
public sealed class MenuQrCodesController : ControllerBase
{
    private readonly ISender _sender;

    public MenuQrCodesController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<QrCodeDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<QrCodeDto>>> GetAll(
        Guid restaurantId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new GetMenuQrCodesQuery(restaurantId), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{qrCodeId:guid}")]
    [ProducesResponseType(typeof(QrCodeDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<QrCodeDto>> GetById(
        Guid restaurantId,
        Guid qrCodeId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(
            new GetMenuQrCodeByIdQuery(restaurantId, qrCodeId),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost]
    [Consumes("application/json")]
    [RequestSizeLimit(16384)]
    [ProducesResponseType(typeof(QrCodeDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<QrCodeDto>> Create(
        Guid restaurantId,
        [FromBody] CreateMenuQrCodeRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateMenuQrCodeCommand(
            restaurantId,
            request.TargetUrl,
            request.IsActive);

        var result = await _sender.Send(command, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpPut("{qrCodeId:guid}")]
    [Consumes("application/json")]
    [RequestSizeLimit(16384)]
    [ProducesResponseType(typeof(QrCodeDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<QrCodeDto>> Update(
        Guid restaurantId,
        Guid qrCodeId,
        [FromBody] UpdateMenuQrCodeRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateMenuQrCodeCommand(
            restaurantId,
            qrCodeId,
            request.TargetUrl,
            request.IsActive);

        var result = await _sender.Send(command, cancellationToken);
        return Ok(result);
    }

    [HttpPost("{qrCodeId:guid}/deactivate")]
    [ProducesResponseType(typeof(QrCodeDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<QrCodeDto>> Deactivate(
        Guid restaurantId,
        Guid qrCodeId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(
            new DeactivateMenuQrCodeCommand(restaurantId, qrCodeId),
            cancellationToken);

        return Ok(result);
    }
}

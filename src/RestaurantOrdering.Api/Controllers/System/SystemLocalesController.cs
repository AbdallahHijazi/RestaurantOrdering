using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantOrdering.Application.Features.Locales.DTOs;
using RestaurantOrdering.Application.Features.Locales.Queries.GetSystemLocales;

namespace RestaurantOrdering.Api.Controllers.System;

[ApiController]
[Authorize]
[Route("api/v1/system/locales")]
public sealed class SystemLocalesController : ControllerBase
{
    private readonly ISender _sender;

    public SystemLocalesController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<SystemLocaleDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SystemLocaleDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new GetSystemLocalesQuery(), cancellationToken);
        return Ok(result);
    }
}

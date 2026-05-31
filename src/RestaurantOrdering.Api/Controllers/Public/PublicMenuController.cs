using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RestaurantOrdering.Application.Features.PublicMenu.DTOs;
using RestaurantOrdering.Application.Features.PublicMenu.Queries.GetPublicMenuBySlug;

namespace RestaurantOrdering.Api.Controllers.Public;

[ApiController]
[AllowAnonymous]
[Route("api/v1/public/restaurants/{slug}/menu")]
public sealed class PublicMenuController : ControllerBase
{
    private readonly ISender _sender;

    public PublicMenuController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet]
    [EnableRateLimiting("public-read")]
    [ProducesResponseType(typeof(PublicMenuDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PublicMenuDto>> GetMenu(
        string slug,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new GetPublicMenuBySlugQuery(slug), cancellationToken);
        return Ok(result);
    }
}

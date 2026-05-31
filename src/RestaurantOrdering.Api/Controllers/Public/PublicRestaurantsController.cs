using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RestaurantOrdering.Application.Features.Restaurants.DTOs;
using RestaurantOrdering.Application.Features.Restaurants.Queries.GetPublicRestaurantBySlug;

namespace RestaurantOrdering.Api.Controllers.Public;

[ApiController]
[AllowAnonymous]
[Route("api/v1/public/restaurants")]
public sealed class PublicRestaurantsController : ControllerBase
{
    private readonly ISender _sender;

    public PublicRestaurantsController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet("{slug}")]
    [EnableRateLimiting("public-read")]
    [ProducesResponseType(typeof(PublicRestaurantDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PublicRestaurantDto>> GetBySlug(
        string slug,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new GetPublicRestaurantBySlugQuery(slug), cancellationToken);
        return Ok(result);
    }
}

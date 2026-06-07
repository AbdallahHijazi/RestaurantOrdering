using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantOrdering.Api.Contracts.Public;
using RestaurantOrdering.Application.Features.PublicTables.DTOs;
using RestaurantOrdering.Application.Features.PublicTables.Queries.ResolvePublicTable;

namespace RestaurantOrdering.Api.Controllers.Public;

[ApiController]
[AllowAnonymous]
[Route("api/v1/public/restaurants/{slug}/tables")]
public sealed class PublicTablesController : ControllerBase
{
    private readonly ISender _sender;

    public PublicTablesController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet("resolve")]
    [ProducesResponseType(typeof(ResolvedPublicTableResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ResolvedPublicTableResponse>> Resolve(
        string slug,
        [FromQuery] string token,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new ResolvePublicTableQuery(slug, token), cancellationToken);
        return Ok(MapResponse(result));
    }

    private static ResolvedPublicTableResponse MapResponse(ResolvedPublicTableDto dto) =>
        new()
        {
            TableId = dto.TableId,
            TableName = dto.TableName,
            Zone = dto.Zone,
            RestaurantId = dto.RestaurantId
        };
}

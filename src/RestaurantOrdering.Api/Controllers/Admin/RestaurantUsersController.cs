using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RestaurantOrdering.Api.Contracts.Admin.Users;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.RestaurantUsers.Commands.CreateRestaurantUser;
using RestaurantOrdering.Application.Features.RestaurantUsers.Commands.UpdateRestaurantUserRole;
using RestaurantOrdering.Application.Features.RestaurantUsers.DTOs;
using RestaurantOrdering.Application.Features.RestaurantUsers.Queries.GetRestaurantStaffUsers;

namespace RestaurantOrdering.Api.Controllers.Admin;

[ApiController]
[Authorize(Policy = ApplicationPolicies.RestaurantOwnerOnly)]
[Route("api/v1/admin/restaurants/{restaurantId:guid}/users")]
public sealed class RestaurantUsersController : ControllerBase
{
    private readonly ISender _sender;

    public RestaurantUsersController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<RestaurantUserResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RestaurantUserResponse>>> GetUsers(
        Guid restaurantId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new GetRestaurantStaffUsersQuery(restaurantId), cancellationToken);
        return Ok(result.Select(MapUserResponse).ToList());
    }

    [HttpPost]
    [EnableRateLimiting("restaurant-user-management")]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(RestaurantUserResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<RestaurantUserResponse>> Create(
        Guid restaurantId,
        [FromBody] CreateRestaurantUserRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateRestaurantUserCommand(
            restaurantId,
            request.Email,
            request.Password,
            request.FullName,
            request.PhoneNumber,
            request.Role);

        var result = await _sender.Send(command, cancellationToken);
        return CreatedAtAction(nameof(Create), new { restaurantId, userId = result.Id }, MapUserResponse(result));
    }

    [HttpPatch("{userId:guid}/role")]
    [EnableRateLimiting("restaurant-user-management")]
    [Consumes("application/json")]
    [RequestSizeLimit(16384)]
    [ProducesResponseType(typeof(RestaurantUserRoleResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<RestaurantUserRoleResponse>> UpdateRole(
        Guid restaurantId,
        Guid userId,
        [FromBody] UpdateRestaurantUserRoleRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateRestaurantUserRoleCommand(restaurantId, userId, request.Role);
        var result = await _sender.Send(command, cancellationToken);
        return Ok(MapRoleResponse(result));
    }

    private static RestaurantUserResponse MapUserResponse(RestaurantUserDto dto) =>
        new()
        {
            Id = dto.Id,
            Email = dto.Email,
            FullName = dto.FullName,
            PhoneNumber = dto.PhoneNumber,
            RestaurantId = dto.RestaurantId,
            Role = dto.Role,
            IsActive = dto.IsActive
        };

    private static RestaurantUserRoleResponse MapRoleResponse(RestaurantUserRoleDto dto) =>
        new()
        {
            Id = dto.Id,
            RestaurantId = dto.RestaurantId,
            Role = dto.Role
        };
}

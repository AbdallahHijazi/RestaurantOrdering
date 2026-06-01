using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RestaurantOrdering.Api.Contracts.Auth;
using RestaurantOrdering.Application.Features.Auth.Commands.Login;
using RestaurantOrdering.Application.Features.Auth.DTOs;

namespace RestaurantOrdering.Api.Controllers.Auth;

[ApiController]
[AllowAnonymous]
[Route("api/v1/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly ISender _sender;

    public AuthController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth-login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(
            new LoginCommand(request.Email, request.Password),
            cancellationToken);

        return Ok(ToResponse(result));
    }

    private static LoginResponse ToResponse(LoginResultDto dto) =>
        new()
        {
            AccessToken = dto.AccessToken,
            ExpiresAtUtc = dto.ExpiresAtUtc,
            UserId = dto.UserId,
            RestaurantId = dto.RestaurantId
        };
}


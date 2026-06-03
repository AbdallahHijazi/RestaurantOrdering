using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RestaurantOrdering.Api.Contracts.Auth;
using RestaurantOrdering.Application.Features.Auth.Commands.RegisterRestaurantOwner;
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

    [HttpPost("register-owner")]
    [EnableRateLimiting("register-owner")]
    [ProducesResponseType(typeof(RegisterRestaurantOwnerResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<RegisterRestaurantOwnerResponse>> RegisterOwner(
        [FromBody] RegisterRestaurantOwnerRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(
            new RegisterRestaurantOwnerCommand(
                request.Email,
                request.Password,
                request.FullName,
                request.PhoneNumber,
                request.RestaurantNameAr,
                request.RestaurantNameEn,
                request.Slug),
            cancellationToken);

        return CreatedAtAction(nameof(RegisterOwner), value: ToResponse(result));
    }

    private static LoginResponse ToResponse(LoginResultDto dto) =>
        new()
        {
            AccessToken = dto.AccessToken,
            ExpiresAtUtc = dto.ExpiresAtUtc,
            UserId = dto.UserId,
            RestaurantId = dto.RestaurantId
        };

    private static RegisterRestaurantOwnerResponse ToResponse(RegisterRestaurantOwnerResultDto dto) =>
        new()
        {
            UserId = dto.UserId,
            RestaurantId = dto.RestaurantId,
            Email = dto.Email,
            Role = dto.Role
        };
}


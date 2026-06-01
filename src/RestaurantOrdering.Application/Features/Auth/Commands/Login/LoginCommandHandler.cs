using MediatR;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.Auth.DTOs;

namespace RestaurantOrdering.Application.Features.Auth.Commands.Login;

public sealed class LoginCommandHandler : IRequestHandler<LoginCommand, LoginResultDto>
{
    private const string InvalidCredentialsMessage = "Invalid email or password.";

    private readonly IUserAuthenticationService _userAuthenticationService;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public LoginCommandHandler(
        IUserAuthenticationService userAuthenticationService,
        IJwtTokenGenerator jwtTokenGenerator)
    {
        _userAuthenticationService = userAuthenticationService;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<LoginResultDto> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var authenticatedUser = await _userAuthenticationService.AuthenticateAsync(
            request.Email,
            request.Password,
            cancellationToken);

        if (authenticatedUser is null)
        {
            throw new UnauthorizedAccessException(InvalidCredentialsMessage);
        }

        var tokenResult = _jwtTokenGenerator.GenerateToken(
            authenticatedUser.UserId,
            authenticatedUser.Email,
            authenticatedUser.RestaurantId,
            authenticatedUser.Roles);

        return new LoginResultDto
        {
            AccessToken = tokenResult.AccessToken,
            ExpiresAtUtc = tokenResult.ExpiresAtUtc,
            UserId = authenticatedUser.UserId,
            RestaurantId = authenticatedUser.RestaurantId
        };
    }
}


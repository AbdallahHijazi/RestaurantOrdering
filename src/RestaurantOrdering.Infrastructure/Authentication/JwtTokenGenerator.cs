using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using RestaurantOrdering.Application.Common.Interfaces;

namespace RestaurantOrdering.Infrastructure.Authentication;

public sealed class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly JwtOptions _jwtOptions;
    private readonly IDateTimeService _dateTimeService;

    public JwtTokenGenerator(IOptions<JwtOptions> jwtOptions, IDateTimeService dateTimeService)
    {
        _jwtOptions = jwtOptions.Value;
        _dateTimeService = dateTimeService;
    }

    public JwtTokenResult GenerateToken(
        Guid userId,
        string email,
        Guid? restaurantId,
        IReadOnlyList<string> roles)
    {
        var issuedAtUtc = _dateTimeService.UtcNow;
        var expiresAtUtc = issuedAtUtc.AddMinutes(_jwtOptions.AccessTokenLifetimeMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(JwtRegisteredClaimNames.Email, email)
        };

        if (restaurantId.HasValue)
        {
            claims.Add(new Claim("restaurant_id", restaurantId.Value.ToString()));
        }

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        if (!JwtSigningKeyHelper.TryGetSigningKeyBytes(_jwtOptions.SigningKey, out var signingKeyBytes))
        {
            throw new InvalidOperationException("Jwt:SigningKey must be configured with at least 32 bytes.");
        }

        var key = new SymmetricSecurityKey(signingKeyBytes);
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var tokenDescriptor = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            notBefore: issuedAtUtc,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        var accessToken = new JwtSecurityTokenHandler().WriteToken(tokenDescriptor);

        return new JwtTokenResult(accessToken, expiresAtUtc);
    }
}


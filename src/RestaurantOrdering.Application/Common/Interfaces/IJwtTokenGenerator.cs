namespace RestaurantOrdering.Application.Common.Interfaces;

public interface IJwtTokenGenerator
{
    JwtTokenResult GenerateToken(
        Guid userId,
        string email,
        Guid? restaurantId,
        IReadOnlyList<string> roles);
}

public sealed record JwtTokenResult(string AccessToken, DateTime ExpiresAtUtc);


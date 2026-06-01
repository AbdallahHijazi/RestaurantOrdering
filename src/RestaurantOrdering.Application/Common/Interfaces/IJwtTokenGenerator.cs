namespace RestaurantOrdering.Application.Common.Interfaces;

public interface IJwtTokenGenerator
{
    JwtTokenResult GenerateToken(Guid userId, string email, Guid? restaurantId);
}

public sealed record JwtTokenResult(string AccessToken, DateTime ExpiresAtUtc);


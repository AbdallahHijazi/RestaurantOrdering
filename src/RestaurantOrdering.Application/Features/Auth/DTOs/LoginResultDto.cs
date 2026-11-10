namespace RestaurantOrdering.Application.Features.Auth.DTOs;

public sealed class LoginResultDto
{
    public string AccessToken { get; init; } = string.Empty;
    public DateTime ExpiresAtUtc { get; init; }
    public Guid UserId { get; init; }
    public Guid? RestaurantId { get; init; }
}


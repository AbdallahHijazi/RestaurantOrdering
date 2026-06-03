namespace RestaurantOrdering.Api.Contracts.Auth;

public sealed class RegisterRestaurantOwnerResponse
{
    public Guid UserId { get; init; }
    public Guid RestaurantId { get; init; }
    public string Email { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
}

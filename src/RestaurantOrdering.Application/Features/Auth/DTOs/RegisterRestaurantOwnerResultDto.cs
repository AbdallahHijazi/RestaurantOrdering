namespace RestaurantOrdering.Application.Features.Auth.DTOs;

public sealed class RegisterRestaurantOwnerResultDto
{
    public Guid UserId { get; init; }
    public Guid RestaurantId { get; init; }
    public string Email { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
}

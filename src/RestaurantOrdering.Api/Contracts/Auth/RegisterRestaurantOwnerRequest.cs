namespace RestaurantOrdering.Api.Contracts.Auth;

public sealed class RegisterRestaurantOwnerRequest
{
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string? PhoneNumber { get; init; }
    public string RestaurantNameAr { get; init; } = string.Empty;
    public string? RestaurantNameEn { get; init; }
    public string Slug { get; init; } = string.Empty;
}

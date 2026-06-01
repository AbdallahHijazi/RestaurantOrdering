namespace RestaurantOrdering.Application.Features.RestaurantUsers.DTOs;

public sealed class RestaurantUserDto
{
    public Guid Id { get; init; }
    public string Email { get; init; } = string.Empty;
    public string? FullName { get; init; }
    public string? PhoneNumber { get; init; }
    public Guid RestaurantId { get; init; }
    public string Role { get; init; } = string.Empty;
    public bool IsActive { get; init; }
}

public sealed class RestaurantUserRoleDto
{
    public Guid Id { get; init; }
    public Guid RestaurantId { get; init; }
    public string Role { get; init; } = string.Empty;
}

using System.ComponentModel.DataAnnotations;

namespace RestaurantOrdering.Api.Contracts.Admin.Users;

public sealed class CreateRestaurantUserRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; init; } = string.Empty;

    [Required]
    public string Password { get; init; } = string.Empty;

    public string? FullName { get; init; }

    public string? PhoneNumber { get; init; }

    [Required]
    public string Role { get; init; } = string.Empty;
}

public sealed class UpdateRestaurantUserRoleRequest
{
    [Required]
    public string Role { get; init; } = string.Empty;
}

public sealed class RestaurantUserResponse
{
    public Guid Id { get; init; }
    public string Email { get; init; } = string.Empty;
    public string? FullName { get; init; }
    public string? PhoneNumber { get; init; }
    public Guid RestaurantId { get; init; }
    public string Role { get; init; } = string.Empty;
    public bool IsActive { get; init; }
}

public sealed class RestaurantUserRoleResponse
{
    public Guid Id { get; init; }
    public Guid RestaurantId { get; init; }
    public string Role { get; init; } = string.Empty;
}

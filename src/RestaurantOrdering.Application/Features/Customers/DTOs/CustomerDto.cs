namespace RestaurantOrdering.Application.Features.Customers.DTOs;

public class CustomerDto
{
    public Guid Id { get; init; }
    public Guid RestaurantId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Phone { get; init; } = string.Empty;
    public string? Email { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

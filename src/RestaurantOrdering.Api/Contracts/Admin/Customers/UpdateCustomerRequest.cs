namespace RestaurantOrdering.Api.Contracts.Admin.Customers;

public sealed class UpdateCustomerRequest
{
    public string Name { get; init; } = string.Empty;
    public string Phone { get; init; } = string.Empty;
    public string? Email { get; init; }
}

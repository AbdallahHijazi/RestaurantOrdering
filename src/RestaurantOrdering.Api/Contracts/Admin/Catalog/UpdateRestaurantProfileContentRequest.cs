namespace RestaurantOrdering.Api.Contracts.Admin.Catalog;

public sealed class UpdateRestaurantProfileContentRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? Address { get; init; }
}

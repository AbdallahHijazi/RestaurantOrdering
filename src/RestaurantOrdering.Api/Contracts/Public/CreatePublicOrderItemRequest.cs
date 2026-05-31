namespace RestaurantOrdering.Api.Contracts.Public;

public sealed class CreatePublicOrderItemRequest
{
    public Guid MenuItemId { get; init; }
    public int Quantity { get; init; }
    public string? Notes { get; init; }
}

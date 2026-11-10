namespace RestaurantOrdering.Api.Contracts.Admin.Tables;

public sealed class CreateRestaurantTableRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Zone { get; init; }
    public bool IsActive { get; init; } = true;
}

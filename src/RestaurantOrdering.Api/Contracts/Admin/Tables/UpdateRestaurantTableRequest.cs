namespace RestaurantOrdering.Api.Contracts.Admin.Tables;

public sealed class UpdateRestaurantTableRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Zone { get; init; }
}

namespace RestaurantOrdering.Api.Contracts.Public;

public sealed class ResolvedPublicTableResponse
{
    public Guid TableId { get; init; }
    public string TableName { get; init; } = string.Empty;
    public string? Zone { get; init; }
    public Guid RestaurantId { get; init; }
}

namespace RestaurantOrdering.Api.Contracts.Admin.Tables;

public sealed class RestaurantTableResponse
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Zone { get; init; }
    public string PublicToken { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

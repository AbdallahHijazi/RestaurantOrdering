namespace RestaurantOrdering.Application.Features.PublicTables.DTOs;

public sealed class ResolvedPublicTableDto
{
    public Guid TableId { get; init; }
    public string TableName { get; init; } = string.Empty;
    public string? Zone { get; init; }
    public Guid RestaurantId { get; init; }
}

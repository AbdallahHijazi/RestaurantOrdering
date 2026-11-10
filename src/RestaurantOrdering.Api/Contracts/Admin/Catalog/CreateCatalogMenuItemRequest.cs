namespace RestaurantOrdering.Api.Contracts.Admin.Catalog;

public sealed class CreateCatalogMenuItemRequest
{
    public Guid CategoryId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public decimal Price { get; init; }
    public decimal? DiscountPrice { get; init; }
    public Guid? ImageFileId { get; init; }
    public int DisplayOrder { get; init; }
    public bool IsAvailable { get; init; }
    public bool IsActive { get; init; }
}

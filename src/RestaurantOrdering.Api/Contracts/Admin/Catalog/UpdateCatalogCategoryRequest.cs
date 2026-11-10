namespace RestaurantOrdering.Api.Contracts.Admin.Catalog;

public sealed class UpdateCatalogCategoryRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public int DisplayOrder { get; init; }
    public bool IsActive { get; init; }
}

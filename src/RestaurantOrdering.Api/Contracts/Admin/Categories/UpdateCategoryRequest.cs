namespace RestaurantOrdering.Api.Contracts.Admin.Categories;

public sealed class UpdateCategoryRequest
{
    public string NameAr { get; init; } = string.Empty;
    public string? NameEn { get; init; }
    public string? DescriptionAr { get; init; }
    public string? DescriptionEn { get; init; }
    public int DisplayOrder { get; init; }
    public bool IsActive { get; init; }
}

namespace RestaurantOrdering.Application.Features.Categories.DTOs;

public class CategoryDto
{
    public Guid Id { get; init; }
    public Guid RestaurantId { get; init; }
    public string NameAr { get; init; } = string.Empty;
    public string? NameEn { get; init; }
    public string? DescriptionAr { get; init; }
    public string? DescriptionEn { get; init; }
    public int DisplayOrder { get; init; }
    public bool IsActive { get; init; }
    public int ItemCount { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

namespace RestaurantOrdering.Application.Features.MenuItems.DTOs;

public class MenuItemDto
{
    public Guid Id { get; init; }
    public Guid RestaurantId { get; init; }
    public Guid CategoryId { get; init; }
    public Guid? ImageFileId { get; init; }
    public string NameAr { get; init; } = string.Empty;
    public string? NameEn { get; init; }
    public string? DescriptionAr { get; init; }
    public string? DescriptionEn { get; init; }
    public decimal Price { get; init; }
    public decimal? DiscountPrice { get; init; }
    public int DisplayOrder { get; init; }
    public bool IsAvailable { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

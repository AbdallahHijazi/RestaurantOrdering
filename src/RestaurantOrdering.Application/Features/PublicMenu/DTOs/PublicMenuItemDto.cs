namespace RestaurantOrdering.Application.Features.PublicMenu.DTOs;

public class PublicMenuItemDto
{
    public Guid Id { get; init; }
    public Guid CategoryId { get; init; }
    public Guid? ImageFileId { get; init; }
    public string? ImageUrl { get; init; }
    public string NameAr { get; init; } = string.Empty;
    public string? NameEn { get; init; }
    public string? DescriptionAr { get; init; }
    public string? DescriptionEn { get; init; }
    public decimal Price { get; init; }
    public decimal? DiscountPrice { get; init; }
    public int DisplayOrder { get; init; }
}

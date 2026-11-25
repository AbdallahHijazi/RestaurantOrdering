namespace RestaurantOrdering.Application.Features.PublicMenu.DTOs;

public class PublicMenuCategoryDto
{
    public Guid Id { get; init; }
    public string NameAr { get; init; } = string.Empty;
    public string? NameEn { get; init; }
    public string? DescriptionAr { get; init; }
    public string? DescriptionEn { get; init; }
    public int DisplayOrder { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string ResolvedLocale { get; init; } = "ar";
    public bool FallbackApplied { get; init; }
    public IReadOnlyList<PublicMenuItemDto> Items { get; init; } = Array.Empty<PublicMenuItemDto>();
}

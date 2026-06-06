namespace RestaurantOrdering.Application.Features.PublicMenu.DTOs;

public class PublicMenuDto
{
    public Guid Id { get; init; }
    public string Slug { get; init; } = string.Empty;
    public string NameAr { get; init; } = string.Empty;
    public string? NameEn { get; init; }
    public string? DescriptionAr { get; init; }
    public string? DescriptionEn { get; init; }
    public Guid? LogoFileId { get; init; }
    public string? LogoUrl { get; init; }
    public string? CoverImageUrl { get; init; }
    public string AccentColor { get; init; } = "#B8663F";
    public string PhoneNumber { get; init; } = string.Empty;
    public string? WhatsAppNumber { get; init; }
    public string? AddressAr { get; init; }
    public string? AddressEn { get; init; }
    public decimal? Latitude { get; init; }
    public decimal? Longitude { get; init; }
    public string? CurrencyCode { get; init; }
    public decimal? TaxRate { get; init; }
    public decimal? DeliveryFee { get; init; }
    public decimal? MinimumOrderAmount { get; init; }
    public bool? IsDeliveryEnabled { get; init; }
    public bool? IsPickupEnabled { get; init; }
    public IReadOnlyList<PublicMenuCategoryDto> Categories { get; init; } = Array.Empty<PublicMenuCategoryDto>();
}

namespace RestaurantOrdering.Application.Features.Restaurants.DTOs;

public class RestaurantDto
{
    public Guid Id { get; init; }
    public Guid OwnerId { get; init; }
    public string Slug { get; init; } = string.Empty;
    public string NameAr { get; init; } = string.Empty;
    public string? NameEn { get; init; }
    public string? DescriptionAr { get; init; }
    public string? DescriptionEn { get; init; }
    public Guid? LogoFileId { get; init; }
    public string PhoneNumber { get; init; } = string.Empty;
    public string? WhatsAppNumber { get; init; }
    public string? AddressAr { get; init; }
    public string? AddressEn { get; init; }
    public decimal? Latitude { get; init; }
    public decimal? Longitude { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

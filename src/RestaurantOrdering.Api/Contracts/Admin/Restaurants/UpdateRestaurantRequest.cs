namespace RestaurantOrdering.Api.Contracts.Admin.Restaurants;

public sealed class UpdateRestaurantRequest
{
    public string Slug { get; init; } = string.Empty;
    public string NameAr { get; init; } = string.Empty;
    public string? NameEn { get; init; }
    public string? DescriptionAr { get; init; }
    public string? DescriptionEn { get; init; }
    public string PhoneNumber { get; init; } = string.Empty;
    public string? WhatsAppNumber { get; init; }
    public string? AddressAr { get; init; }
    public string? AddressEn { get; init; }
    public decimal? Latitude { get; init; }
    public decimal? Longitude { get; init; }
}

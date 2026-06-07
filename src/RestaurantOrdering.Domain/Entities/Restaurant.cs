using RestaurantOrdering.Domain.Common;

namespace RestaurantOrdering.Domain.Entities;

public class Restaurant : AuditableEntity, ISoftDelete
{
    public Guid OwnerId { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string? NameEn { get; set; }
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public Guid? LogoFileId { get; set; }
    public Guid? CoverImageFileId { get; set; }
    public string AccentColor { get; set; } = "#B8663F";
    public string PhoneNumber { get; set; } = string.Empty;
    public string? WhatsAppNumber { get; set; }
    public string? AddressAr { get; set; }
    public string? AddressEn { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; }

    public RestaurantSettings? Settings { get; set; }
    public ICollection<Category> Categories { get; set; } = new List<Category>();
    public ICollection<MenuItem> MenuItems { get; set; } = new List<MenuItem>();
    public ICollection<Order> Orders { get; set; } = new List<Order>();
    public ICollection<Customer> Customers { get; set; } = new List<Customer>();
    public ICollection<MediaFile> MediaFiles { get; set; } = new List<MediaFile>();
    public ICollection<QrCode> QrCodes { get; set; } = new List<QrCode>();
    public ICollection<RestaurantTable> Tables { get; set; } = new List<RestaurantTable>();
    public MediaFile? LogoFile { get; set; }
    public MediaFile? CoverImageFile { get; set; }
}

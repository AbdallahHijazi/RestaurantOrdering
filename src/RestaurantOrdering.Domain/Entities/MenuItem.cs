using RestaurantOrdering.Domain.Common;

namespace RestaurantOrdering.Domain.Entities;

public class MenuItem : AuditableEntity, ISoftDelete
{
    public Guid RestaurantId { get; set; }
    public Guid CategoryId { get; set; }
    public Guid? ImageFileId { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string? NameEn { get; set; }
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public decimal Price { get; set; }
    public decimal? DiscountPrice { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsAvailable { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public Category Category { get; set; } = null!;
    public MediaFile? ImageFile { get; set; }
}

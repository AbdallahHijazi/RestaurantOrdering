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
    public bool UsesSizes { get; set; }
    public IReadOnlyList<MenuItemSize>? Sizes { get; set; }
    public decimal Price { get; set; }
    public MenuDiscount? Discount { get; set; }
    public SizeDiscountMode SizeDiscountMode { get; set; }
    public MenuDiscount? UniformDiscount { get; set; }
    public decimal? DiscountPrice { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsAvailable { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; }
    public int ContentVersion { get; set; } = 1;

    public Restaurant Restaurant { get; set; } = null!;
    public Category Category { get; set; } = null!;
    public MediaFile? ImageFile { get; set; }
}

using RestaurantOrdering.Domain.Common;

namespace RestaurantOrdering.Domain.Entities;

public class RestaurantSupportedLocale : BaseEntity
{
    public Guid RestaurantId { get; set; }
    public string LocaleCode { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Restaurant Restaurant { get; set; } = null!;
    public LocaleDefinition Locale { get; set; } = null!;
}

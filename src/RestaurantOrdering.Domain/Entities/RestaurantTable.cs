using RestaurantOrdering.Domain.Common;

namespace RestaurantOrdering.Domain.Entities;

public class RestaurantTable : AuditableEntity
{
    public Guid RestaurantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Zone { get; set; }
    public string PublicToken { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    /// <summary>Soft delete: archived tables are hidden and unusable but kept for historical orders.</summary>
    public bool IsArchived { get; set; }
    public DateTime? ArchivedAt { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}

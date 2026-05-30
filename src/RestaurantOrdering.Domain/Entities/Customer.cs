using RestaurantOrdering.Domain.Common;

namespace RestaurantOrdering.Domain.Entities;

public class Customer : AuditableEntity, ISoftDelete
{
    public Guid RestaurantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool IsDeleted { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}

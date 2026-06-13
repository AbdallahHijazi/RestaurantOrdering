using RestaurantOrdering.Domain.Common;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Domain.Entities;

public class RestaurantUserPermissionGrant : BaseEntity
{
    public Guid RestaurantId { get; set; }
    public Guid UserId { get; set; }
    public RestaurantPermission Permission { get; set; }
    public Guid? GrantedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Restaurant Restaurant { get; set; } = null!;
}

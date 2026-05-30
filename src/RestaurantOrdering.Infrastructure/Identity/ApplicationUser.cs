using Microsoft.AspNetCore.Identity;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Infrastructure.Identity;

public class ApplicationUser : IdentityUser<Guid>
{
    public string? FullName { get; set; }
    public Guid? RestaurantId { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public Restaurant? AssignedRestaurant { get; set; }
    public ICollection<Restaurant> OwnedRestaurants { get; set; } = new List<Restaurant>();
}

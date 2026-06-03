using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Infrastructure.Persistence;

namespace RestaurantOrdering.Infrastructure.Identity;

public sealed class UserDashboardAccessReader : IUserDashboardAccessReader
{
    private static readonly string[] DashboardRoles =
    [
        ApplicationRoles.RestaurantOwner,
        ApplicationRoles.RestaurantManager,
        ApplicationRoles.KitchenManager
    ];

    private readonly ApplicationDbContext _context;

    public UserDashboardAccessReader(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> HasDashboardAccessAsync(
        Guid userId,
        Guid restaurantId,
        CancellationToken cancellationToken)
    {
        var accessContext = await (
            from user in _context.Users.AsNoTracking()
            join restaurant in _context.Restaurants.AsNoTracking()
                on restaurantId equals restaurant.Id
            where user.Id == userId
                  && !user.IsDeleted
                  && user.IsActive
                  && user.RestaurantId == restaurantId
            select new
            {
                restaurant.OwnerId
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (accessContext is null)
        {
            return false;
        }

        var roleNames = await (
            from userRole in _context.UserRoles.AsNoTracking()
            join role in _context.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            where userRole.UserId == userId
            select role.Name!)
            .ToListAsync(cancellationToken);

        var hasDashboardRole = roleNames.Any(roleName =>
            roleName is not null && DashboardRoles.Contains(roleName));

        if (!hasDashboardRole)
        {
            return false;
        }

        if (roleNames.Contains(ApplicationRoles.RestaurantOwner)
            && accessContext.OwnerId != userId)
        {
            return false;
        }

        return true;
    }
}

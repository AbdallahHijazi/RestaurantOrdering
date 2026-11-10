using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Persistence;

namespace RestaurantOrdering.Infrastructure.Identity;

public sealed class RestaurantPermissionService : IRestaurantPermissionService
{
    private readonly ApplicationDbContext _context;

    public RestaurantPermissionService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> HasPermissionAsync(
        Guid userId,
        Guid restaurantId,
        RestaurantPermission permission,
        CancellationToken cancellationToken)
    {
        var access = await GetAccessContextAsync(userId, restaurantId, cancellationToken);
        if (access is null)
        {
            return false;
        }

        if (access.IsOwner)
        {
            return true;
        }

        if (!RestaurantPermissionMatrix.CanRoleReceivePermission(access.PrimaryRole, permission))
        {
            return false;
        }

        return await _context.RestaurantUserPermissionGrants
            .AsNoTracking()
            .AnyAsync(
                grant => grant.RestaurantId == restaurantId
                         && grant.UserId == userId
                         && grant.Permission == permission,
                cancellationToken);
    }

    public async Task EnsurePermissionAsync(
        Guid userId,
        Guid restaurantId,
        RestaurantPermission permission,
        CancellationToken cancellationToken)
    {
        if (!await HasPermissionAsync(userId, restaurantId, permission, cancellationToken))
        {
            throw new ForbiddenException(
                $"Permission '{RestaurantPermissionCatalog.ToStorageName(permission)}' is required.");
        }
    }

    private async Task<UserPermissionAccessContext?> GetAccessContextAsync(
        Guid userId,
        Guid restaurantId,
        CancellationToken cancellationToken)
    {
        var restaurantAccess = await (
            from restaurant in _context.Restaurants.AsNoTracking()
            join user in _context.Users.AsNoTracking() on userId equals user.Id
            where restaurant.Id == restaurantId
                  && !restaurant.IsDeleted
                  && !user.IsDeleted
                  && user.IsActive
                  && user.RestaurantId == restaurantId
            select new
            {
                restaurant.OwnerId
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (restaurantAccess is null)
        {
            return null;
        }

        if (restaurantAccess.OwnerId == userId)
        {
            return new UserPermissionAccessContext(IsOwner: true, PrimaryRole: ApplicationRoles.RestaurantOwner);
        }

        var roleNames = await (
            from userRole in _context.UserRoles.AsNoTracking()
            join role in _context.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            where userRole.UserId == userId
            select role.Name!)
            .ToListAsync(cancellationToken);

        var staffRole = roleNames
            .Where(roleName => AssignableRestaurantStaffRoles.All.Contains(roleName))
            .OrderBy(roleName => roleName, StringComparer.Ordinal)
            .FirstOrDefault();

        if (staffRole is null)
        {
            return null;
        }

        return new UserPermissionAccessContext(IsOwner: false, PrimaryRole: staffRole);
    }

    private sealed record UserPermissionAccessContext(bool IsOwner, string PrimaryRole);
}

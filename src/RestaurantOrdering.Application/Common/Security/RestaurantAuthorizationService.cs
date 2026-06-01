using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;

namespace RestaurantOrdering.Application.Common.Security;

public sealed class RestaurantAuthorizationService : IRestaurantAuthorizationService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public RestaurantAuthorizationService(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task EnsureCurrentUserOwnsRestaurantAsync(
        Guid restaurantId,
        CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId
            ?? throw new UnauthorizedAccessException("Authentication is required.");

        var hasAccess = await _context.Restaurants
            .AsNoTracking()
            .AnyAsync(
                restaurant => restaurant.Id == restaurantId && restaurant.OwnerId == currentUserId,
                cancellationToken);

        if (!hasAccess)
        {
            // Security boundary: hide resource existence from non-owners.
            throw new NotFoundException("Restaurant", restaurantId);
        }
    }
}


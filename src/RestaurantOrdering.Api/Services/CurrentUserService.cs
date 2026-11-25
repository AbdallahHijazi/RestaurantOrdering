using System.Security.Claims;
using RestaurantOrdering.Application.Common.Interfaces;

namespace RestaurantOrdering.Api.Services;

public sealed class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? UserId
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            var idClaim = user?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? user?.FindFirstValue("sub");

            return Guid.TryParse(idClaim, out var userId) ? userId : null;
        }
    }
}


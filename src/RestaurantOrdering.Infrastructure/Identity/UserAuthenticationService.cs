using Microsoft.AspNetCore.Identity;
using RestaurantOrdering.Application.Common.Interfaces;

namespace RestaurantOrdering.Infrastructure.Identity;

public sealed class UserAuthenticationService : IUserAuthenticationService
{
    private readonly UserManager<ApplicationUser> _userManager;

    public UserAuthenticationService(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    public async Task<AuthenticatedUserInfo?> AuthenticateAsync(
        string email,
        string password,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var user = await _userManager.FindByEmailAsync(email.Trim());

        if (user is null)
        {
            return null;
        }

        if (await _userManager.IsLockedOutAsync(user))
        {
            return null;
        }

        var passwordValid = await _userManager.CheckPasswordAsync(user, password);
        if (!passwordValid)
        {
            await _userManager.AccessFailedAsync(user);
            return null;
        }

        await _userManager.ResetAccessFailedCountAsync(user);

        return new AuthenticatedUserInfo(user.Id, user.Email ?? string.Empty, user.RestaurantId);
    }
}


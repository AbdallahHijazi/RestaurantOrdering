namespace RestaurantOrdering.Application.Common.Interfaces;

public interface IUserAuthenticationService
{
    Task<AuthenticatedUserInfo?> AuthenticateAsync(
        string email,
        string password,
        CancellationToken cancellationToken);
}

public sealed record AuthenticatedUserInfo(Guid UserId, string Email, Guid? RestaurantId);


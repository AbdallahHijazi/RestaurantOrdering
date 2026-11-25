using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using RestaurantOrdering.Application.Common.Security;

namespace RestaurantOrdering.Infrastructure.Persistence.Seed;

public sealed class ApplicationRoleInitializer
{
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;
    private readonly ILogger<ApplicationRoleInitializer> _logger;

    public ApplicationRoleInitializer(
        RoleManager<IdentityRole<Guid>> roleManager,
        ILogger<ApplicationRoleInitializer> logger)
    {
        _roleManager = roleManager;
        _logger = logger;
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        foreach (var roleName in ApplicationRoles.All)
        {
            if (await _roleManager.RoleExistsAsync(roleName))
            {
                continue;
            }

            var createResult = await _roleManager.CreateAsync(new IdentityRole<Guid>
            {
                Name = roleName,
                NormalizedName = roleName.ToUpperInvariant()
            });

            if (!createResult.Succeeded)
            {
                var errors = string.Join("; ", createResult.Errors.Select(error => error.Description));
                throw new InvalidOperationException($"Failed to create application role '{roleName}': {errors}");
            }

            _logger.LogInformation("Created application role {RoleName}.", roleName);
        }
    }
}

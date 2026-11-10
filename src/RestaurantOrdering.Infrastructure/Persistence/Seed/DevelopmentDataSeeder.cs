using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Infrastructure.Identity;
using RestaurantOrdering.Infrastructure.Persistence;

namespace RestaurantOrdering.Infrastructure.Persistence.Seed;

public class DevelopmentDataSeeder
{
    private const string AdminEmailKey = "DevelopmentSeed:AdminEmail";
    private const string AdminPasswordKey = "DevelopmentSeed:AdminPassword";
    private const string AdminFullNameKey = "DevelopmentSeed:AdminFullName";

    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DevelopmentDataSeeder> _logger;

    public DevelopmentDataSeeder(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        IConfiguration configuration,
        ILogger<DevelopmentDataSeeder> logger)
    {
        _context = context;
        _userManager = userManager;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        var owner = await TryEnsureDevelopmentAdminUserAsync(cancellationToken);

        if (owner is null)
        {
            _logger.LogInformation(
                "Development admin seed skipped because local credentials are not configured.");
            return;
        }

        var restaurantExists = await _context.Restaurants
            .IgnoreQueryFilters()
            .AnyAsync(r => r.Id == DevelopmentSeedIds.RestaurantId, cancellationToken);

        if (!restaurantExists)
        {
            var restaurant = new Restaurant
            {
                Id = DevelopmentSeedIds.RestaurantId,
                OwnerId = DevelopmentSeedIds.OwnerUserId,
                Slug = "demo-cafe",
                NameAr = "كافيه تجريبي",
                NameEn = "Demo Cafe",
                DescriptionAr = "مطعم تجريبي للاختبارات المحلية",
                DescriptionEn = "Development demo restaurant",
                PhoneNumber = "+0000000000",
                WhatsAppNumber = null,
                AddressAr = "عنوان تجريبي",
                AddressEn = "Development address",
                Latitude = null,
                Longitude = null,
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.Restaurants.Add(restaurant);
            _logger.LogInformation("Created development restaurant {RestaurantId}.", restaurant.Id);
        }
        else
        {
            var restaurant = await _context.Restaurants
                .IgnoreQueryFilters()
                .FirstAsync(r => r.Id == DevelopmentSeedIds.RestaurantId, cancellationToken);

            if (restaurant.OwnerId != DevelopmentSeedIds.OwnerUserId)
            {
                restaurant.OwnerId = DevelopmentSeedIds.OwnerUserId;
            }
        }

        var settingsExists = await _context.RestaurantSettings
            .IgnoreQueryFilters()
            .AnyAsync(s => s.Id == DevelopmentSeedIds.RestaurantSettingsId, cancellationToken);

        if (!settingsExists)
        {
            var settings = new RestaurantSettings
            {
                Id = DevelopmentSeedIds.RestaurantSettingsId,
                RestaurantId = DevelopmentSeedIds.RestaurantId,
                CurrencyCode = "USD",
                TimeZone = "UTC",
                TaxRate = 0,
                DeliveryFee = 0,
                MinimumOrderAmount = 0,
                IsDeliveryEnabled = true,
                IsPickupEnabled = true,
                WorkingHoursJson = null,
                CreatedAt = DateTime.UtcNow
            };

            _context.RestaurantSettings.Add(settings);
            _logger.LogInformation("Created development restaurant settings {SettingsId}.", settings.Id);
        }

        await _context.SaveChangesAsync(cancellationToken);

        if (owner.RestaurantId != DevelopmentSeedIds.RestaurantId)
        {
            owner.RestaurantId = DevelopmentSeedIds.RestaurantId;

            var updateResult = await _userManager.UpdateAsync(owner);

            if (!updateResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to link development owner to restaurant: {FormatIdentityErrors(updateResult)}");
            }

            _logger.LogInformation(
                "Linked development owner {OwnerId} to restaurant {RestaurantId}.",
                owner.Id,
                DevelopmentSeedIds.RestaurantId);
        }

        await EnsureDevelopmentOwnerRoleAsync(owner);

        _logger.LogInformation("Development data seed completed successfully.");
    }

    private async Task EnsureDevelopmentOwnerRoleAsync(ApplicationUser owner)
    {
        if (await _userManager.IsInRoleAsync(owner, ApplicationRoles.RestaurantOwner))
        {
            return;
        }

        var addRoleResult = await _userManager.AddToRoleAsync(owner, ApplicationRoles.RestaurantOwner);

        if (!addRoleResult.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to assign development owner role: {FormatIdentityErrors(addRoleResult)}");
        }

        _logger.LogInformation("Assigned {RoleName} to development owner {OwnerId}.", ApplicationRoles.RestaurantOwner, owner.Id);
    }

    private async Task<ApplicationUser?> TryEnsureDevelopmentAdminUserAsync(
        CancellationToken cancellationToken)
    {
        var configuredEmail = _configuration[AdminEmailKey];
        var configuredPassword = _configuration[AdminPasswordKey];
        var hasConfiguredCredentials =
            !string.IsNullOrWhiteSpace(configuredEmail) &&
            !string.IsNullOrWhiteSpace(configuredPassword);

        var owner = await _userManager.FindByIdAsync(DevelopmentSeedIds.OwnerUserId.ToString());

        if (!hasConfiguredCredentials)
        {
            return owner;
        }

        var email = configuredEmail!.Trim();
        var password = configuredPassword!;
        var fullName = _configuration[AdminFullNameKey];

        if (owner is not null)
        {
            if (!string.Equals(owner.Email, email, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Development admin seed failed because the configured email does not match the existing development user.");
            }

            await EnsureDevelopmentAdminProfileAsync(owner, fullName);
            return owner;
        }

        var existingByEmail = await _userManager.FindByEmailAsync(email);

        if (existingByEmail is not null)
        {
            throw new InvalidOperationException(
                "Development admin seed failed because the configured email is already assigned to a different user.");
        }

        owner = new ApplicationUser
        {
            Id = DevelopmentSeedIds.OwnerUserId,
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            FullName = string.IsNullOrWhiteSpace(fullName)
                ? "Development Restaurant Owner"
                : fullName.Trim(),
            IsActive = true,
            IsDeleted = false,
            LockoutEnabled = true,
            RestaurantId = null,
            CreatedAt = DateTime.UtcNow
        };

        var createResult = await _userManager.CreateAsync(owner, password);

        if (!createResult.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to create development admin user: {FormatIdentityErrors(createResult)}");
        }

        _logger.LogInformation("Created development admin user {OwnerId}.", owner.Id);
        return owner;
    }

    private async Task EnsureDevelopmentAdminProfileAsync(
        ApplicationUser owner,
        string? fullName)
    {
        var requiresUpdate = false;

        if (!owner.EmailConfirmed)
        {
            owner.EmailConfirmed = true;
            requiresUpdate = true;
        }

        if (!owner.IsActive)
        {
            owner.IsActive = true;
            requiresUpdate = true;
        }

        if (owner.IsDeleted)
        {
            owner.IsDeleted = false;
            requiresUpdate = true;
        }

        if (!owner.LockoutEnabled)
        {
            owner.LockoutEnabled = true;
            requiresUpdate = true;
        }

        if (!string.IsNullOrWhiteSpace(fullName) &&
            !string.Equals(owner.FullName, fullName.Trim(), StringComparison.Ordinal))
        {
            owner.FullName = fullName.Trim();
            requiresUpdate = true;
        }

        if (!requiresUpdate)
        {
            return;
        }

        var updateResult = await _userManager.UpdateAsync(owner);

        if (!updateResult.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to update development admin user: {FormatIdentityErrors(updateResult)}");
        }

    }

    private static string FormatIdentityErrors(IdentityResult result) =>
        string.Join("; ", result.Errors.Select(error => error.Description));
}

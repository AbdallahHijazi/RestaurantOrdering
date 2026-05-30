using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Infrastructure.Identity;
using RestaurantOrdering.Infrastructure.Persistence;

namespace RestaurantOrdering.Infrastructure.Persistence.Seed;

public class DevelopmentDataSeeder
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<DevelopmentDataSeeder> _logger;

    public DevelopmentDataSeeder(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        ILogger<DevelopmentDataSeeder> logger)
    {
        _context = context;
        _userManager = userManager;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        var owner = await _userManager.FindByIdAsync(DevelopmentSeedIds.OwnerUserId.ToString());

        if (owner is null)
        {
            owner = new ApplicationUser
            {
                Id = DevelopmentSeedIds.OwnerUserId,
                UserName = "dev.owner@restaurantordering.local",
                Email = "dev.owner@restaurantordering.local",
                EmailConfirmed = true,
                FullName = "Development Restaurant Owner",
                IsActive = true,
                IsDeleted = false,
                RestaurantId = null,
                CreatedAt = DateTime.UtcNow
            };

            var createResult = await _userManager.CreateAsync(owner);

            if (!createResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to create development owner: {FormatIdentityErrors(createResult)}");
            }

            _logger.LogInformation("Created development owner user {OwnerId}.", owner.Id);
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

        _logger.LogInformation("Development data seed completed successfully.");
    }

    private static string FormatIdentityErrors(IdentityResult result) =>
        string.Join("; ", result.Errors.Select(error => error.Description));
}

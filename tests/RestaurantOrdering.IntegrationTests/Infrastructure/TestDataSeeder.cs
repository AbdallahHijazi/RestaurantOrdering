using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Infrastructure.Identity;
using RestaurantOrdering.Infrastructure.Persistence;

namespace RestaurantOrdering.IntegrationTests.Infrastructure;

internal static class TestDataSeeder
{
    internal static readonly Guid OwnerAUserId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1");
    internal static readonly Guid OwnerBUserId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2");
    internal static readonly Guid LockoutUserId = Guid.Parse("cccccccc-cccc-cccc-cccc-ccccccccccc3");
    internal static readonly Guid RestaurantAId = Guid.Parse("aaaaaaaa-1111-1111-1111-111111111111");
    internal static readonly Guid RestaurantBId = Guid.Parse("bbbbbbbb-2222-2222-2222-222222222222");
    internal static readonly Guid RestaurantASettingsId = Guid.Parse("aaaaaaaa-3333-3333-3333-333333333333");
    internal static readonly Guid RestaurantBSettingsId = Guid.Parse("bbbbbbbb-4444-4444-4444-444444444444");
    internal static readonly Guid RestaurantBMediaId = Guid.Parse("bbbbbbbb-5555-5555-5555-555555555555");

    internal const string OwnerAEmail = "owner.a@test.local";
    internal const string OwnerBEmail = "owner.b@test.local";
    internal const string LockoutEmail = "lockout.user@test.local";
    internal const string CorrectPassword = "P@ssw0rd!123";

    internal static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var scopedProvider = scope.ServiceProvider;

        var dbContext = scopedProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scopedProvider.GetRequiredService<UserManager<ApplicationUser>>();

        await dbContext.Database.EnsureDeletedAsync();
        await dbContext.Database.EnsureCreatedAsync();

        var ownerA = new ApplicationUser
        {
            Id = OwnerAUserId,
            UserName = OwnerAEmail,
            NormalizedUserName = OwnerAEmail.ToUpperInvariant(),
            Email = OwnerAEmail,
            NormalizedEmail = OwnerAEmail.ToUpperInvariant(),
            EmailConfirmed = true,
            IsActive = true,
            IsDeleted = false,
            RestaurantId = RestaurantAId
        };

        var ownerB = new ApplicationUser
        {
            Id = OwnerBUserId,
            UserName = OwnerBEmail,
            NormalizedUserName = OwnerBEmail.ToUpperInvariant(),
            Email = OwnerBEmail,
            NormalizedEmail = OwnerBEmail.ToUpperInvariant(),
            EmailConfirmed = true,
            IsActive = true,
            IsDeleted = false,
            RestaurantId = RestaurantBId
        };

        var lockoutUser = new ApplicationUser
        {
            Id = LockoutUserId,
            UserName = LockoutEmail,
            NormalizedUserName = LockoutEmail.ToUpperInvariant(),
            Email = LockoutEmail,
            NormalizedEmail = LockoutEmail.ToUpperInvariant(),
            EmailConfirmed = true,
            IsActive = true,
            IsDeleted = false,
            RestaurantId = null
        };

        var ownerACreateResult = await userManager.CreateAsync(ownerA, CorrectPassword);
        if (!ownerACreateResult.Succeeded)
        {
            throw new InvalidOperationException($"Failed to create Owner A: {FormatErrors(ownerACreateResult)}");
        }

        var ownerBCreateResult = await userManager.CreateAsync(ownerB, CorrectPassword);
        if (!ownerBCreateResult.Succeeded)
        {
            throw new InvalidOperationException($"Failed to create Owner B: {FormatErrors(ownerBCreateResult)}");
        }

        var lockoutUserCreateResult = await userManager.CreateAsync(lockoutUser, CorrectPassword);
        if (!lockoutUserCreateResult.Succeeded)
        {
            throw new InvalidOperationException($"Failed to create lockout user: {FormatErrors(lockoutUserCreateResult)}");
        }

        dbContext.Restaurants.AddRange(
            new Restaurant
            {
                Id = RestaurantAId,
                OwnerId = OwnerAUserId,
                Slug = "restaurant-a",
                NameAr = "مطعم أ",
                NameEn = "Restaurant A",
                PhoneNumber = "+1111111111",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new Restaurant
            {
                Id = RestaurantBId,
                OwnerId = OwnerBUserId,
                Slug = "restaurant-b",
                NameAr = "مطعم ب",
                NameEn = "Restaurant B",
                PhoneNumber = "+2222222222",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });

        dbContext.RestaurantSettings.AddRange(
            new RestaurantSettings
            {
                Id = RestaurantASettingsId,
                RestaurantId = RestaurantAId,
                CurrencyCode = "SAR",
                TimeZone = "Asia/Riyadh",
                TaxRate = 15m,
                DeliveryFee = 0m,
                MinimumOrderAmount = 0m,
                IsDeliveryEnabled = true,
                IsPickupEnabled = true,
                CreatedAt = DateTime.UtcNow
            },
            new RestaurantSettings
            {
                Id = RestaurantBSettingsId,
                RestaurantId = RestaurantBId,
                CurrencyCode = "SAR",
                TimeZone = "Asia/Riyadh",
                TaxRate = 15m,
                DeliveryFee = 0m,
                MinimumOrderAmount = 0m,
                IsDeliveryEnabled = true,
                IsPickupEnabled = true,
                CreatedAt = DateTime.UtcNow
            });

        dbContext.MediaFiles.Add(
            new MediaFile
            {
                Id = RestaurantBMediaId,
                RestaurantId = RestaurantBId,
                FileName = "logo-b.png",
                StoredFileName = "logo-b-stored.png",
                OriginalFileName = "logo-b.png",
                FileUrl = "/uploads/test/logo-b-stored.png",
                ContentType = "image/png",
                FileSizeBytes = 128,
                CreatedAt = DateTime.UtcNow
            });

        await dbContext.SaveChangesAsync();

        var ownerAInStore = await userManager.FindByEmailAsync(OwnerAEmail);
        if (ownerAInStore is null || !await userManager.CheckPasswordAsync(ownerAInStore, CorrectPassword))
        {
            throw new InvalidOperationException("Owner A test user failed authentication checks after seeding.");
        }

        var restaurantAExists = await dbContext.Restaurants.AnyAsync(item => item.Slug == "restaurant-a");
        if (!restaurantAExists)
        {
            throw new InvalidOperationException("Restaurant A was not persisted during test seeding.");
        }
    }

    private static string FormatErrors(IdentityResult result) =>
        string.Join("; ", result.Errors.Select(error => error.Description));
}


using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Identity;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.Infrastructure.Persistence.Seed;

namespace RestaurantOrdering.IntegrationTests.Infrastructure;

internal static class TestDataSeeder
{
    internal static readonly Guid OwnerAUserId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1");
    internal static readonly Guid OwnerBUserId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2");
    internal static readonly Guid LockoutUserId = Guid.Parse("cccccccc-cccc-cccc-cccc-ccccccccccc3");
    internal static readonly Guid ManagerAUserId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4");
    internal static readonly Guid KitchenAUserId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5");
    internal static readonly Guid RestaurantAId = Guid.Parse("aaaaaaaa-1111-1111-1111-111111111111");
    internal static readonly Guid RestaurantBId = Guid.Parse("bbbbbbbb-2222-2222-2222-222222222222");
    internal static readonly Guid RestaurantASettingsId = Guid.Parse("aaaaaaaa-3333-3333-3333-333333333333");
    internal static readonly Guid RestaurantBSettingsId = Guid.Parse("bbbbbbbb-4444-4444-4444-444444444444");
    internal static readonly Guid RestaurantBMediaId = Guid.Parse("bbbbbbbb-5555-5555-5555-555555555555");
    internal static readonly Guid CategoryAId = Guid.Parse("aaaaaaaa-6666-6666-6666-666666666666");
    internal static readonly Guid MenuItemAId = Guid.Parse("aaaaaaaa-7777-7777-7777-777777777777");
    internal static readonly Guid OrderAId = Guid.Parse("aaaaaaaa-8888-8888-8888-888888888888");
    internal static readonly Guid OrderACompletedId = Guid.Parse("aaaaaaaa-9999-9999-9999-999999999999");
    internal static readonly Guid OrderACancelledId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01");
    internal static readonly Guid OrderBId = Guid.Parse("bbbbbbbb-8888-8888-8888-888888888888");

    internal const string OwnerAEmail = "owner.a@test.local";
    internal const string OwnerBEmail = "owner.b@test.local";
    internal const string LockoutEmail = "lockout.user@test.local";
    internal const string ManagerAEmail = "manager.a@test.local";
    internal const string KitchenAEmail = "kitchen.a@test.local";
    internal const string CorrectPassword = "P@ssw0rd!123";

    internal static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var scopedProvider = scope.ServiceProvider;

        var dbContext = scopedProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scopedProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleInitializer = scopedProvider.GetRequiredService<ApplicationRoleInitializer>();

        await dbContext.Database.EnsureDeletedAsync();
        await dbContext.Database.EnsureCreatedAsync();
        await roleInitializer.InitializeAsync();

        var ownerA = CreateUser(OwnerAUserId, OwnerAEmail, RestaurantAId);
        var ownerB = CreateUser(OwnerBUserId, OwnerBEmail, RestaurantBId);
        var lockoutUser = CreateUser(LockoutUserId, LockoutEmail, null);
        var managerA = CreateUser(ManagerAUserId, ManagerAEmail, RestaurantAId);
        var kitchenA = CreateUser(KitchenAUserId, KitchenAEmail, RestaurantAId);

        await CreateUserWithRoleAsync(userManager, ownerA, ApplicationRoles.RestaurantOwner);
        await CreateUserWithRoleAsync(userManager, ownerB, ApplicationRoles.RestaurantOwner);
        await CreateUserWithRoleAsync(userManager, lockoutUser, ApplicationRoles.RestaurantManager);
        await CreateUserWithRoleAsync(userManager, managerA, ApplicationRoles.RestaurantManager);
        await CreateUserWithRoleAsync(userManager, kitchenA, ApplicationRoles.KitchenManager);

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

        var seededAt = DateTime.UtcNow;

        dbContext.Categories.Add(
            new Category
            {
                Id = CategoryAId,
                RestaurantId = RestaurantAId,
                NameAr = "فئة اختبار",
                NameEn = "Test Category",
                DisplayOrder = 1,
                IsActive = true,
                IsDeleted = false,
                CreatedAt = seededAt
            });

        dbContext.MenuItems.Add(
            new MenuItem
            {
                Id = MenuItemAId,
                RestaurantId = RestaurantAId,
                CategoryId = CategoryAId,
                NameAr = "صنف اختبار",
                NameEn = "Test Item",
                Price = 25m,
                DisplayOrder = 1,
                IsAvailable = true,
                IsActive = true,
                IsDeleted = false,
                CreatedAt = seededAt
            });

        dbContext.Orders.AddRange(
            CreateOrder(OrderAId, RestaurantAId, OrderStatus.New, "ORD-A-NEW", seededAt),
            CreateOrder(OrderACompletedId, RestaurantAId, OrderStatus.Completed, "ORD-A-DONE", seededAt),
            CreateOrder(OrderACancelledId, RestaurantAId, OrderStatus.Cancelled, "ORD-A-CANC", seededAt),
            CreateOrder(OrderBId, RestaurantBId, OrderStatus.New, "ORD-B-NEW", seededAt));

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

    private static ApplicationUser CreateUser(Guid id, string email, Guid? restaurantId) =>
        new()
        {
            Id = id,
            UserName = email,
            NormalizedUserName = email.ToUpperInvariant(),
            Email = email,
            NormalizedEmail = email.ToUpperInvariant(),
            EmailConfirmed = true,
            IsActive = true,
            IsDeleted = false,
            LockoutEnabled = true,
            RestaurantId = restaurantId
        };

    private static async Task CreateUserWithRoleAsync(
        UserManager<ApplicationUser> userManager,
        ApplicationUser user,
        string role)
    {
        var createResult = await userManager.CreateAsync(user, CorrectPassword);
        if (!createResult.Succeeded)
        {
            throw new InvalidOperationException($"Failed to create user {user.Email}: {FormatErrors(createResult)}");
        }

        var addRoleResult = await userManager.AddToRoleAsync(user, role);
        if (!addRoleResult.Succeeded)
        {
            throw new InvalidOperationException($"Failed to assign role {role} to {user.Email}: {FormatErrors(addRoleResult)}");
        }
    }

    private static string FormatErrors(IdentityResult result) =>
        string.Join("; ", result.Errors.Select(error => error.Description));

    private static Order CreateOrder(
        Guid orderId,
        Guid restaurantId,
        OrderStatus status,
        string orderNumber,
        DateTime createdAt) =>
        new()
        {
            Id = orderId,
            RestaurantId = restaurantId,
            OrderNumber = orderNumber,
            GuestName = "Test Guest",
            GuestPhone = "+10000000001",
            OrderType = OrderType.Pickup,
            OrderStatus = status,
            Subtotal = 25m,
            DiscountAmount = 0m,
            TaxAmount = 0m,
            DeliveryFee = 0m,
            TotalAmount = 25m,
            CurrencyCode = "SAR",
            IsDeleted = false,
            CreatedAt = createdAt,
            OrderItems =
            [
                new OrderItem
                {
                    Id = Guid.NewGuid(),
                    OrderId = orderId,
                    MenuItemId = restaurantId == RestaurantAId ? MenuItemAId : null,
                    ItemNameAr = "صنف اختبار",
                    ItemNameEn = "Test Item",
                    UnitPrice = 25m,
                    Quantity = 1,
                    TotalPrice = 25m,
                    CreatedAt = createdAt
                }
            ]
        };
}

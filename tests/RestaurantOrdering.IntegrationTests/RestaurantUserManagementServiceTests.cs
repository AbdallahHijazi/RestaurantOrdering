using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Infrastructure.Identity;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.Infrastructure.Persistence.Seed;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class RestaurantUserManagementServiceTests
{
    private const string StaffPassword = "P@ssw0rd!123";

    [Fact]
    public async Task CreateUser_WhenAddToRoleFails_RollsBackAndDoesNotLeaveOrphanUser()
    {
        using var provider = await CreateServiceProviderAsync();
        var faultInjectingUserManager = provider.GetRequiredService<FaultInjectingUserManager>();
        faultInjectingUserManager.FaultInjection = new IdentityFaultInjection { FailAddToRole = true };

        var service = provider.GetRequiredService<RestaurantUserManagementService>();
        var dbContext = provider.GetRequiredService<ApplicationDbContext>();

        var act = async () => await service.CreateRestaurantStaffUserAsync(
            TestDataSeeder.RestaurantAId,
            "orphan.test@test.local",
            StaffPassword,
            "Orphan Test",
            null,
            ApplicationRoles.RestaurantManager,
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Failed to assign role to restaurant user*");

        var userCount = await dbContext.Users.CountAsync(user => user.Email == "orphan.test@test.local");
        userCount.Should().Be(0);
    }

    [Fact]
    public async Task CreateUser_WhenCleanupDeleteFails_ThrowsAndLogsWithoutPassword()
    {
        using var provider = await CreateServiceProviderAsync();
        var faultInjectingUserManager = provider.GetRequiredService<FaultInjectingUserManager>();
        faultInjectingUserManager.FaultInjection = new IdentityFaultInjection
        {
            FailAddToRole = true,
            FailDelete = true
        };

        var loggerProvider = provider.GetRequiredService<CapturingLoggerProvider>();
        var service = provider.GetRequiredService<RestaurantUserManagementService>();

        var act = async () => await service.CreateRestaurantStaffUserAsync(
            TestDataSeeder.RestaurantAId,
            "cleanup.fail@test.local",
            StaffPassword,
            "Cleanup Fail",
            null,
            ApplicationRoles.RestaurantManager,
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Failed to complete user creation cleanup after role assignment failure*");

        loggerProvider.Messages.Should().Contain(message =>
            message.Contains("Compensating delete failed", StringComparison.Ordinal) &&
            message.Contains("cleanup.fail@test.local", StringComparison.Ordinal) == false &&
            message.Contains(StaffPassword, StringComparison.Ordinal) == false);
    }

    [Fact]
    public async Task UpdateRole_WhenAddToRoleFails_RestoresPreviousRole()
    {
        using var provider = await CreateServiceProviderAsync();
        await SeedStaffUserAsync(provider, TestDataSeeder.KitchenAUserId, TestDataSeeder.KitchenAEmail, ApplicationRoles.KitchenManager);

        var faultInjectingUserManager = provider.GetRequiredService<FaultInjectingUserManager>();
        faultInjectingUserManager.FaultInjection = new IdentityFaultInjection { FailAddToRole = true };

        var service = provider.GetRequiredService<RestaurantUserManagementService>();
        var userManager = provider.GetRequiredService<UserManager<ApplicationUser>>();

        var act = async () => await service.UpdateRestaurantStaffUserRoleAsync(
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.KitchenAUserId,
            ApplicationRoles.RestaurantManager,
            TestDataSeeder.OwnerAUserId,
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Failed to assign staff role*");

        var user = await userManager.FindByIdAsync(TestDataSeeder.KitchenAUserId.ToString());
        user.Should().NotBeNull();
        (await userManager.IsInRoleAsync(user!, ApplicationRoles.KitchenManager)).Should().BeTrue();
        (await userManager.IsInRoleAsync(user!, ApplicationRoles.RestaurantManager)).Should().BeFalse();
    }

    [Fact]
    public async Task UpdateRole_WhenRollbackRestoreFails_ThrowsAndLogsWithoutPassword()
    {
        using var provider = await CreateServiceProviderAsync();
        await SeedStaffUserAsync(provider, TestDataSeeder.KitchenAUserId, TestDataSeeder.KitchenAEmail, ApplicationRoles.KitchenManager);

        var faultInjectingUserManager = provider.GetRequiredService<FaultInjectingUserManager>();
        faultInjectingUserManager.FaultInjection = new IdentityFaultInjection
        {
            FailAddToRole = true,
            FailRestoreStaffRoles = true
        };

        var loggerProvider = provider.GetRequiredService<CapturingLoggerProvider>();
        var service = provider.GetRequiredService<RestaurantUserManagementService>();

        var act = async () => await service.UpdateRestaurantStaffUserRoleAsync(
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.KitchenAUserId,
            ApplicationRoles.RestaurantManager,
            TestDataSeeder.OwnerAUserId,
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Failed to restore staff role assignments during compensating rollback*");

        loggerProvider.Messages.Should().Contain(message =>
            message.Contains("Failed to restore staff role", StringComparison.Ordinal) &&
            message.Contains(StaffPassword, StringComparison.Ordinal) == false);
    }

    [Fact]
    public async Task UpdateRole_WhenRemoveFromRoleFailsMidway_RestoresPreviouslyRemovedRoles()
    {
        using var provider = await CreateServiceProviderAsync();
        var userManager = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var staffUser = await SeedStaffUserAsync(
            provider,
            TestDataSeeder.ManagerAUserId,
            TestDataSeeder.ManagerAEmail,
            ApplicationRoles.RestaurantManager);

        (await userManager.AddToRoleAsync(staffUser, ApplicationRoles.KitchenManager)).Succeeded.Should().BeTrue();

        var faultInjectingUserManager = provider.GetRequiredService<FaultInjectingUserManager>();
        faultInjectingUserManager.FaultInjection = new IdentityFaultInjection
        {
            FailRemoveFromRole = true,
            FailRemoveFromRoleName = ApplicationRoles.KitchenManager
        };

        var service = provider.GetRequiredService<RestaurantUserManagementService>();

        var act = async () => await service.UpdateRestaurantStaffUserRoleAsync(
            TestDataSeeder.RestaurantAId,
            TestDataSeeder.ManagerAUserId,
            ApplicationRoles.KitchenManager,
            TestDataSeeder.OwnerAUserId,
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Failed to remove existing staff role*");

        var user = await userManager.FindByIdAsync(TestDataSeeder.ManagerAUserId.ToString());
        user.Should().NotBeNull();
        (await userManager.IsInRoleAsync(user!, ApplicationRoles.RestaurantManager)).Should().BeTrue();
        (await userManager.IsInRoleAsync(user!, ApplicationRoles.KitchenManager)).Should().BeTrue();
    }

    private static async Task<ServiceProvider> CreateServiceProviderAsync()
    {
        var loggerProvider = new CapturingLoggerProvider();
        var services = new ServiceCollection();
        services.AddSingleton(loggerProvider);
        services.AddLogging(builder => builder.AddProvider(loggerProvider));
        services.AddSingleton<IConfiguration>(
            new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>()).Build());

        var databaseName = $"restaurant-user-management-service-{Guid.NewGuid():N}";
        services.AddDbContext<ApplicationDbContext>(options =>
            options
                .UseInMemoryDatabase(databaseName)
                .ConfigureWarnings(warnings =>
                    warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning)));

        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(10);
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<ApplicationDbContext>();

        services.RemoveAll<UserManager<ApplicationUser>>();
        services.AddScoped<FaultInjectingUserManager>();
        services.AddScoped<UserManager<ApplicationUser>>(sp => sp.GetRequiredService<FaultInjectingUserManager>());
        services.AddScoped<ApplicationRoleInitializer>();
        services.AddScoped<RestaurantUserManagementService>();

        var provider = services.BuildServiceProvider();
        var dbContext = provider.GetRequiredService<ApplicationDbContext>();
        await dbContext.Database.EnsureCreatedAsync();
        await provider.GetRequiredService<ApplicationRoleInitializer>().InitializeAsync();
        await SeedRestaurantAsync(dbContext);

        return provider;
    }

    private static async Task SeedRestaurantAsync(ApplicationDbContext dbContext)
    {
        dbContext.Restaurants.Add(new Restaurant
        {
            Id = TestDataSeeder.RestaurantAId,
            OwnerId = TestDataSeeder.OwnerAUserId,
            Slug = "restaurant-a",
            NameAr = "مطعم أ",
            NameEn = "Restaurant A",
            PhoneNumber = "+1111111111",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync();
    }

    private static async Task<ApplicationUser> SeedStaffUserAsync(
        ServiceProvider provider,
        Guid userId,
        string email,
        string role)
    {
        var userManager = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var existingUser = await userManager.FindByIdAsync(userId.ToString());

        if (existingUser is not null)
        {
            return existingUser;
        }

        var user = new ApplicationUser
        {
            Id = userId,
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            IsActive = true,
            IsDeleted = false,
            LockoutEnabled = true,
            RestaurantId = TestDataSeeder.RestaurantAId,
            CreatedAt = DateTime.UtcNow
        };

        (await userManager.CreateAsync(user, StaffPassword)).Succeeded.Should().BeTrue();
        (await userManager.AddToRoleAsync(user, role)).Succeeded.Should().BeTrue();
        return user;
    }

    private sealed class CapturingLoggerProvider : ILoggerProvider
    {
        public List<string> Messages { get; } = [];

        public ILogger CreateLogger(string categoryName) => new CapturingLogger(Messages);

        public void Dispose()
        {
        }
    }

    private sealed class CapturingLogger(List<string> messages) : ILogger
    {
        public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            messages.Add(formatter(state, exception));
            if (exception is not null)
            {
                messages.Add(exception.Message);
            }
        }
    }

    private sealed class NullScope : IDisposable
    {
        public static NullScope Instance { get; } = new();

        public void Dispose()
        {
        }
    }
}

using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Identity;
using RestaurantOrdering.Infrastructure.Persistence.Seed;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class RestaurantPermissionFoundationTests : IAsyncLifetime
{
    private readonly string _databaseName = $"RestaurantOrdering_Perm7A4_{Guid.NewGuid():N}";
    private ServiceProvider _provider = null!;
    private ApplicationDbContext _context = null!;
    private IRestaurantPermissionService _permissionService = null!;

    private string ConnectionString =>
        $"Server=(localdb)\\MSSQLLocalDB;Database={_databaseName};Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";

    public async Task InitializeAsync()
    {
        var services = new ServiceCollection();
        services.AddDbContext<ApplicationDbContext>(options => options.UseNpgsql(ConnectionString));
        services
            .AddIdentityCore<ApplicationUser>()
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<ApplicationDbContext>();
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());
        services.AddScoped<IRestaurantPermissionService, RestaurantPermissionService>();
        services.AddScoped<ApplicationRoleInitializer>();
        services.AddLogging();

        _provider = services.BuildServiceProvider();
        _context = _provider.GetRequiredService<ApplicationDbContext>();
        _permissionService = _provider.GetRequiredService<IRestaurantPermissionService>();

        await _context.Database.MigrateAsync();
        await _provider.GetRequiredService<ApplicationRoleInitializer>().InitializeAsync();
        await SeedRestaurantsAndUsersAsync();
    }

    public async Task DisposeAsync()
    {
        await _context.Database.EnsureDeletedAsync();
        await _context.DisposeAsync();
        await _provider.DisposeAsync();
    }

    [Fact]
    public async Task Owner_HasManageLocalesAndApproveWithoutGrantRows()
    {
        (await _permissionService.HasPermissionAsync(
            TestDataSeeder.OwnerAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.RestaurantSettingsManageLocales,
            CancellationToken.None)).Should().BeTrue();

        (await _permissionService.HasPermissionAsync(
            TestDataSeeder.OwnerAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.TranslationsApprove,
            CancellationToken.None)).Should().BeTrue();

        (await _context.RestaurantUserPermissionGrants.AnyAsync()).Should().BeFalse();
    }

    [Fact]
    public async Task Owner_ForRestaurantA_DoesNotHavePermissionInRestaurantB()
    {
        (await _permissionService.HasPermissionAsync(
            TestDataSeeder.OwnerAUserId,
            TestDataSeeder.RestaurantBId,
            RestaurantPermission.TranslationsApprove,
            CancellationToken.None)).Should().BeFalse();
    }

    [Fact]
    public async Task RestaurantManager_WithoutGrant_DoesNotHaveManageLocales()
    {
        (await _permissionService.HasPermissionAsync(
            TestDataSeeder.ManagerAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.RestaurantSettingsManageLocales,
            CancellationToken.None)).Should().BeFalse();
    }

    [Fact]
    public async Task RestaurantManager_WithManageLocalesGrant_HasPermission()
    {
        await AddGrantAsync(
            TestDataSeeder.ManagerAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.RestaurantSettingsManageLocales);

        (await _permissionService.HasPermissionAsync(
            TestDataSeeder.ManagerAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.RestaurantSettingsManageLocales,
            CancellationToken.None)).Should().BeTrue();
    }

    [Fact]
    public async Task RestaurantManager_WithApproveGrant_HasTranslationsApprove()
    {
        await AddGrantAsync(
            TestDataSeeder.ManagerAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.TranslationsApprove);

        (await _permissionService.HasPermissionAsync(
            TestDataSeeder.ManagerAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.TranslationsApprove,
            CancellationToken.None)).Should().BeTrue();
    }

    [Fact]
    public async Task Grant_ForRestaurantA_DoesNotApplyToRestaurantB()
    {
        await AddGrantAsync(
            TestDataSeeder.ManagerAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.TranslationsApprove);

        (await _permissionService.HasPermissionAsync(
            TestDataSeeder.ManagerAUserId,
            TestDataSeeder.RestaurantBId,
            RestaurantPermission.TranslationsApprove,
            CancellationToken.None)).Should().BeFalse();
    }

    [Fact]
    public async Task DuplicateGrant_ForSameUserRestaurantPermission_IsRejected()
    {
        await AddGrantAsync(
            TestDataSeeder.ManagerAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.TranslationsView);

        var act = async () => await AddGrantAsync(
            TestDataSeeder.ManagerAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.TranslationsView);

        await act.Should().ThrowAsync<DbUpdateException>();
    }

    [Fact]
    public async Task KitchenManager_DoesNotReceiveManageLocales_EvenWithErroneousGrantRow()
    {
        await AddGrantAsync(
            TestDataSeeder.KitchenAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.RestaurantSettingsManageLocales);

        (await _permissionService.HasPermissionAsync(
            TestDataSeeder.KitchenAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.RestaurantSettingsManageLocales,
            CancellationToken.None)).Should().BeFalse();
    }

    [Fact]
    public async Task KitchenManager_CanReceiveTranslationsView_WhenGranted()
    {
        await AddGrantAsync(
            TestDataSeeder.KitchenAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.TranslationsView);

        (await _permissionService.HasPermissionAsync(
            TestDataSeeder.KitchenAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.TranslationsView,
            CancellationToken.None)).Should().BeTrue();
    }

    [Fact]
    public async Task DeleteRestaurant_CascadesPermissionGrants()
    {
        var temporaryRestaurantId = Guid.NewGuid();
        _context.Restaurants.Add(new Restaurant
        {
            Id = temporaryRestaurantId,
            OwnerId = TestDataSeeder.OwnerBUserId,
            Slug = $"temp-{Guid.NewGuid():N}"[..20],
            NameAr = "مؤقت",
            PhoneNumber = "+3333333333",
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        await AddGrantAsync(
            TestDataSeeder.ManagerAUserId,
            temporaryRestaurantId,
            RestaurantPermission.TranslationsView);

        var restaurant = await _context.Restaurants.SingleAsync(item => item.Id == temporaryRestaurantId);
        _context.Restaurants.Remove(restaurant);
        await _context.SaveChangesAsync();

        (await _context.RestaurantUserPermissionGrants.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task DeleteUser_CascadesPermissionGrants()
    {
        await AddGrantAsync(
            TestDataSeeder.ManagerAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.TranslationsView);

        var userManager = _provider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await userManager.FindByIdAsync(TestDataSeeder.ManagerAUserId.ToString());
        user.Should().NotBeNull();

        (await userManager.DeleteAsync(user!)).Succeeded.Should().BeTrue();

        (await _context.RestaurantUserPermissionGrants.CountAsync()).Should().Be(0);
    }

    [Fact]
    public void PermissionFoundationMigration_IsAdditiveOnly()
    {
        var migrationPath = Directory
            .GetFiles(
                FindRepositoryRoot(),
                "*AddRestaurantPermissionFoundation.cs",
                SearchOption.AllDirectories)
            .Single(path => !path.EndsWith(".Designer.cs", StringComparison.Ordinal));

        var migration = File.ReadAllText(migrationPath);
        var upMethod = migration.Split("protected override void Down", StringSplitOptions.None)[0];

        upMethod.Should().NotContain("DropColumn");
        upMethod.Should().NotContain("DropTable");
        upMethod.Should().Contain("CreateTable");
        upMethod.Should().Contain("RestaurantUserPermissionGrants");
    }

    [Fact]
    public async Task Login_StillWorks_AfterPermissionFoundationMigration()
    {
        await using var factory = TestWebApplicationFactory.CreateWithSigningKey("permission-foundation-login-key-at-least-32-bytes!");
        await TestDataSeeder.SeedAsync(factory.Services);

        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { Email = TestDataSeeder.OwnerAEmail, Password = TestDataSeeder.CorrectPassword });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private async Task AddGrantAsync(Guid userId, Guid restaurantId, RestaurantPermission permission)
    {
        _context.RestaurantUserPermissionGrants.Add(new RestaurantUserPermissionGrant
        {
            RestaurantId = restaurantId,
            UserId = userId,
            Permission = permission,
            GrantedByUserId = TestDataSeeder.OwnerAUserId,
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
    }

    private async Task SeedRestaurantsAndUsersAsync()
    {
        var userManager = _provider.GetRequiredService<UserManager<ApplicationUser>>();

        await CreateUserWithRoleAsync(userManager, TestDataSeeder.OwnerAUserId, TestDataSeeder.OwnerAEmail, restaurantId: null, ApplicationRoles.RestaurantOwner);
        await CreateUserWithRoleAsync(userManager, TestDataSeeder.OwnerBUserId, TestDataSeeder.OwnerBEmail, restaurantId: null, ApplicationRoles.RestaurantOwner);

        _context.Restaurants.AddRange(
            new Restaurant
            {
                Id = TestDataSeeder.RestaurantAId,
                OwnerId = TestDataSeeder.OwnerAUserId,
                Slug = "restaurant-a",
                NameAr = "مطعم أ",
                PhoneNumber = "+1111111111",
                CreatedAt = DateTime.UtcNow
            },
            new Restaurant
            {
                Id = TestDataSeeder.RestaurantBId,
                OwnerId = TestDataSeeder.OwnerBUserId,
                Slug = "restaurant-b",
                NameAr = "مطعم ب",
                PhoneNumber = "+2222222222",
                CreatedAt = DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        var ownerA = await userManager.FindByIdAsync(TestDataSeeder.OwnerAUserId.ToString());
        ownerA!.RestaurantId = TestDataSeeder.RestaurantAId;
        (await userManager.UpdateAsync(ownerA)).Succeeded.Should().BeTrue();

        var ownerB = await userManager.FindByIdAsync(TestDataSeeder.OwnerBUserId.ToString());
        ownerB!.RestaurantId = TestDataSeeder.RestaurantBId;
        (await userManager.UpdateAsync(ownerB)).Succeeded.Should().BeTrue();

        await CreateUserWithRoleAsync(userManager, TestDataSeeder.ManagerAUserId, TestDataSeeder.ManagerAEmail, TestDataSeeder.RestaurantAId, ApplicationRoles.RestaurantManager);
        await CreateUserWithRoleAsync(userManager, TestDataSeeder.KitchenAUserId, TestDataSeeder.KitchenAEmail, TestDataSeeder.RestaurantAId, ApplicationRoles.KitchenManager);
    }

    private static async Task CreateUserWithRoleAsync(
        UserManager<ApplicationUser> userManager,
        Guid userId,
        string email,
        Guid? restaurantId,
        string role)
    {
        var user = new ApplicationUser
        {
            Id = userId,
            UserName = email,
            NormalizedUserName = email.ToUpperInvariant(),
            Email = email,
            NormalizedEmail = email.ToUpperInvariant(),
            EmailConfirmed = true,
            RestaurantId = restaurantId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        (await userManager.CreateAsync(user, TestDataSeeder.CorrectPassword)).Succeeded.Should().BeTrue();
        (await userManager.AddToRoleAsync(user, role)).Succeeded.Should().BeTrue();
    }

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory is not null)
        {
            if (Directory.Exists(Path.Combine(directory.FullName, "src", "RestaurantOrdering.Infrastructure")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        throw new InvalidOperationException("Could not locate repository root.");
    }
}

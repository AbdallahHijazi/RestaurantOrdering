using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Infrastructure.Identity;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.Infrastructure.Persistence.Seed;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class RestaurantStaffRolesTests : IClassFixture<TestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public RestaurantStaffRolesTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task RoleInitialization_CreatesAllApplicationRoles()
    {
        using var scope = _factory.Services.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

        foreach (var roleName in ApplicationRoles.All)
        {
            (await roleManager.RoleExistsAsync(roleName)).Should().BeTrue();
        }
    }

    [Fact]
    public async Task RoleInitialization_IsIdempotent()
    {
        using var scope = _factory.Services.CreateScope();
        var initializer = scope.ServiceProvider.GetRequiredService<ApplicationRoleInitializer>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

        await initializer.InitializeAsync();
        await initializer.InitializeAsync();

        var roleCount = await roleManager.Roles.CountAsync();
        roleCount.Should().Be(ApplicationRoles.All.Count);
    }

    [Fact]
    public async Task Login_ForOwner_IncludesRestaurantOwnerRoleClaim()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var token = await LoginAndGetTokenAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);
        GetRoleClaims(token).Should().Contain(ApplicationRoles.RestaurantOwner);
    }

    [Fact]
    public async Task Login_ForRestaurantManager_IncludesRestaurantManagerRoleClaim()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var token = await LoginAndGetTokenAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);
        GetRoleClaims(token).Should().Contain(ApplicationRoles.RestaurantManager);
    }

    [Fact]
    public async Task Login_ForKitchenManager_IncludesKitchenManagerRoleClaim()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var token = await LoginAndGetTokenAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);
        GetRoleClaims(token).Should().Contain(ApplicationRoles.KitchenManager);
    }

    [Fact]
    public async Task CreateUser_WithoutToken_Returns401()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
            CreateUserRequest("staff@test.local", TestDataSeeder.CorrectPassword, ApplicationRoles.RestaurantManager));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateUser_WithInvalidToken_Returns401()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "invalid-token");

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
            CreateUserRequest("staff@test.local", TestDataSeeder.CorrectPassword, ApplicationRoles.RestaurantManager));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateUser_AsKitchenManager_Returns403()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
            CreateUserRequest("staff@test.local", TestDataSeeder.CorrectPassword, ApplicationRoles.RestaurantManager));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateUser_AsRestaurantManager_Returns403()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
            CreateUserRequest("staff@test.local", TestDataSeeder.CorrectPassword, ApplicationRoles.KitchenManager));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateUser_AsOwner_CreatesRestaurantManagerSuccessfully()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        const string email = "new.manager@test.local";
        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
            CreateUserRequest(email, TestDataSeeder.CorrectPassword, ApplicationRoles.RestaurantManager));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var payload = await response.Content.ReadFromJsonAsync<RestaurantUserResponse>(JsonOptions);
        payload.Should().NotBeNull();
        payload!.Email.Should().Be(email);
        payload.RestaurantId.Should().Be(TestDataSeeder.RestaurantAId);
        payload.Role.Should().Be(ApplicationRoles.RestaurantManager);
        payload.IsActive.Should().BeTrue();
        JsonSerializer.Serialize(payload).Should().NotContain("Password");

        using var scope = _factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var createdUser = await userManager.FindByEmailAsync(email);
        createdUser.Should().NotBeNull();
        createdUser!.RestaurantId.Should().Be(TestDataSeeder.RestaurantAId);
        createdUser.LockoutEnabled.Should().BeTrue();
        (await userManager.IsInRoleAsync(createdUser, ApplicationRoles.RestaurantManager)).Should().BeTrue();
    }

    [Fact]
    public async Task CreateUser_AsOwner_CreatesKitchenManagerSuccessfully()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        const string email = "new.kitchen@test.local";
        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
            CreateUserRequest(email, TestDataSeeder.CorrectPassword, ApplicationRoles.KitchenManager));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var payload = await response.Content.ReadFromJsonAsync<RestaurantUserResponse>(JsonOptions);
        payload!.Role.Should().Be(ApplicationRoles.KitchenManager);
    }

    [Fact]
    public async Task CreateUser_ForForeignRestaurant_Returns404AndDoesNotCreateUser()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        using var scopeBefore = _factory.Services.CreateScope();
        var dbContextBefore = scopeBefore.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userCountBefore = await dbContextBefore.Users.CountAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}/users",
            CreateUserRequest("foreign.staff@test.local", TestDataSeeder.CorrectPassword, ApplicationRoles.RestaurantManager));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        using var scopeAfter = _factory.Services.CreateScope();
        var dbContextAfter = scopeAfter.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await dbContextAfter.Users.CountAsync()).Should().Be(userCountBefore);
    }

    [Fact]
    public async Task CreateUser_WithDisallowedRole_Returns400()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
            CreateUserRequest("invalid.role@test.local", TestDataSeeder.CorrectPassword, "SuperAdmin"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateUser_WithRestaurantOwnerRole_Returns400()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
            CreateUserRequest("owner.attempt@test.local", TestDataSeeder.CorrectPassword, ApplicationRoles.RestaurantOwner));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateUser_WithDuplicateEmail_Returns409()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
            CreateUserRequest(TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword, ApplicationRoles.KitchenManager));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadAsStringAsync()).Should().Contain("Unable to create user with the provided details.");
    }

    [Fact]
    public async Task CreateUser_WithDuplicateEmailDifferentCase_Returns409()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
            CreateUserRequest(TestDataSeeder.ManagerAEmail.ToUpperInvariant(), TestDataSeeder.CorrectPassword, ApplicationRoles.KitchenManager));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task CreateUser_WithWeakPassword_Returns400AndDoesNotCreateUser()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        using var scopeBefore = _factory.Services.CreateScope();
        var userCountBefore = await scopeBefore.ServiceProvider.GetRequiredService<ApplicationDbContext>().Users.CountAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
            CreateUserRequest("weak.password@test.local", "123", ApplicationRoles.RestaurantManager));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        using var scopeAfter = _factory.Services.CreateScope();
        (await scopeAfter.ServiceProvider.GetRequiredService<ApplicationDbContext>().Users.CountAsync()).Should().Be(userCountBefore);
    }

    [Fact]
    public async Task CreateUser_ThenLogin_ReturnsExpectedRestaurantAndRoleClaim()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        const string email = "login.after.create@test.local";
        var createResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users",
            CreateUserRequest(email, TestDataSeeder.CorrectPassword, ApplicationRoles.RestaurantManager));
        createResponse.EnsureSuccessStatusCode();

        client.DefaultRequestHeaders.Authorization = null;
        var loginResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { Email = email, Password = TestDataSeeder.CorrectPassword });

        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await loginResponse.Content.ReadFromJsonAsync<LoginResponseModel>(JsonOptions);
        payload!.RestaurantId.Should().Be(TestDataSeeder.RestaurantAId);
        GetRoleClaims(payload.AccessToken).Should().Contain(ApplicationRoles.RestaurantManager);
    }

    [Fact]
    public async Task UpdateRole_OwnerChangesKitchenManagerToRestaurantManager_Succeeds()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PatchAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users/{TestDataSeeder.KitchenAUserId}/role",
            new { Role = ApplicationRoles.RestaurantManager });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<RestaurantUserRoleResponse>(JsonOptions);
        payload!.Role.Should().Be(ApplicationRoles.RestaurantManager);

        client.DefaultRequestHeaders.Authorization = null;
        var token = await LoginAndGetTokenAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);
        GetRoleClaims(token).Should().Contain(ApplicationRoles.RestaurantManager);
        GetRoleClaims(token).Should().NotContain(ApplicationRoles.KitchenManager);
    }

    [Fact]
    public async Task UpdateRole_ForUserInForeignRestaurant_Returns404()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PatchAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users/{TestDataSeeder.OwnerBUserId}/role",
            new { Role = ApplicationRoles.RestaurantManager });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateRole_AssigningRestaurantOwner_Returns400()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PatchAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users/{TestDataSeeder.ManagerAUserId}/role",
            new { Role = ApplicationRoles.RestaurantOwner });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateRole_ForOwnerAccount_Returns403()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PatchAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users/{TestDataSeeder.OwnerAUserId}/role",
            new { Role = ApplicationRoles.RestaurantManager });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateRole_AsKitchenManager_Returns403()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PatchAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users/{TestDataSeeder.ManagerAUserId}/role",
            new { Role = ApplicationRoles.KitchenManager });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateRole_AsRestaurantManager_Returns403()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PatchAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/users/{TestDataSeeder.KitchenAUserId}/role",
            new { Role = ApplicationRoles.RestaurantManager });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PublicEndpoints_StayAccessibleWithoutToken()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        (await client.GetAsync("/api/v1/public/restaurants/restaurant-a")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await client.GetAsync("/api/v1/public/restaurants/restaurant-a/menu")).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Login_ExistingFlow_RemainsSuccessful()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { Email = TestDataSeeder.OwnerAEmail, Password = TestDataSeeder.CorrectPassword });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task OwnershipPipeline_StillBlocksForeignRestaurantAccess()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync($"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantBId}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private static object CreateUserRequest(string email, string password, string role) =>
        new
        {
            Email = email,
            Password = password,
            FullName = "Staff User",
            PhoneNumber = "+1000000000",
            Role = role
        };

    private static async Task AuthenticateAsync(HttpClient client, string email, string password)
    {
        var token = await LoginAndGetTokenAsync(client, email, password);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private static async Task<string> LoginAndGetTokenAsync(HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { Email = email, Password = password });
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<LoginResponseModel>(JsonOptions);
        payload.Should().NotBeNull();
        return payload!.AccessToken;
    }

    private static IReadOnlyCollection<string> GetRoleClaims(string accessToken)
    {
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(accessToken);
        return jwt.Claims
            .Where(claim => claim.Type == ClaimTypes.Role || claim.Type == "role")
            .Select(claim => claim.Value)
            .ToArray();
    }

    private HttpClient CreateHttpsClient() =>
        _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

    private sealed class LoginResponseModel
    {
        public string AccessToken { get; init; } = string.Empty;
        public Guid? RestaurantId { get; init; }
    }

    private sealed class RestaurantUserResponse
    {
        public Guid Id { get; init; }
        public string Email { get; init; } = string.Empty;
        public string? FullName { get; init; }
        public string? PhoneNumber { get; init; }
        public Guid RestaurantId { get; init; }
        public string Role { get; init; } = string.Empty;
        public bool IsActive { get; init; }
    }

    private sealed class RestaurantUserRoleResponse
    {
        public Guid Id { get; init; }
        public Guid RestaurantId { get; init; }
        public string Role { get; init; } = string.Empty;
    }
}

using System.IdentityModel.Tokens.Jwt;
using System.Net;
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

/// <summary>
/// Regression tests against SQLite with PRAGMA foreign_keys=ON.
/// Existing integration tests use EF InMemory, which does not enforce FK constraints like SQL Server.
/// </summary>
public sealed class RegisterRestaurantOwnerRelationalTests : IClassFixture<SqliteRelationalWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly SqliteRelationalWebApplicationFactory _factory;

    public RegisterRestaurantOwnerRelationalTests(SqliteRelationalWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task RegisterOwner_WithSqliteForeignKeys_Returns201AndPersistsLinkedEntities()
    {
        await SeedRolesAsync(_factory.Services);
        using var client = CreateHttpsClient(_factory);

        const string email = "sqlite.owner@test.local";
        const string password = "StrongPassword@123";
        const string slug = "sqlite-owner-restaurant";

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register-owner",
            CreateRegisterRequest(email, slug, password));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var payload = await response.Content.ReadFromJsonAsync<RegisterOwnerResponseModel>(JsonOptions);
        payload.Should().NotBeNull();

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        var user = await userManager.FindByEmailAsync(email);
        user.Should().NotBeNull();
        user!.RestaurantId.Should().Be(payload!.RestaurantId);

        var restaurant = await dbContext.Restaurants
            .IgnoreQueryFilters()
            .SingleAsync(item => item.Id == payload.RestaurantId);
        restaurant.OwnerId.Should().Be(user.Id);
        restaurant.Slug.Should().Be(slug);

        var settings = await dbContext.RestaurantSettings
            .SingleAsync(item => item.RestaurantId == payload.RestaurantId);
        settings.Should().NotBeNull();

        (await userManager.IsInRoleAsync(user, ApplicationRoles.RestaurantOwner)).Should().BeTrue();

        var loginResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { Email = email, Password = password });

        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<LoginResponseModel>(JsonOptions);
        loginPayload!.RestaurantId.Should().Be(payload.RestaurantId);
        GetRoleClaims(loginPayload.AccessToken).Should().Contain(ApplicationRoles.RestaurantOwner);
    }

    [Fact]
    public async Task RegisterOwner_WithWeakPassword_OnSqlite_DoesNotLeaveOrphanRows()
    {
        await SeedRolesAsync(_factory.Services);
        using var client = CreateHttpsClient(_factory);

        const string email = "sqlite.weak@test.local";
        const string slug = "sqlite-orphan-check";

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register-owner",
            CreateRegisterRequest(email, slug, "123"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        (await userManager.FindByEmailAsync(email)).Should().BeNull();
        (await dbContext.Restaurants.AnyAsync(item => item.Slug == slug)).Should().BeFalse();
        (await dbContext.RestaurantSettings.AnyAsync()).Should().BeFalse();
    }

    private static async Task SeedRolesAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await dbContext.Database.EnsureDeletedAsync();
        await dbContext.Database.EnsureCreatedAsync();
        await scope.ServiceProvider.GetRequiredService<ApplicationRoleInitializer>().InitializeAsync();
    }

    private static object CreateRegisterRequest(string email, string slug, string password) =>
        new
        {
            Email = email,
            Password = password,
            FullName = "Restaurant Owner",
            PhoneNumber = (string?)null,
            RestaurantNameAr = "مطعمي",
            RestaurantNameEn = "My Restaurant",
            Slug = slug
        };

    private static IReadOnlyCollection<string> GetRoleClaims(string accessToken)
    {
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(accessToken);
        return jwt.Claims
            .Where(claim => claim.Type == ClaimTypes.Role || claim.Type == "role")
            .Select(claim => claim.Value)
            .ToArray();
    }

    private static HttpClient CreateHttpsClient(WebApplicationFactory<Program> factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

    private sealed class RegisterOwnerResponseModel
    {
        public Guid UserId { get; init; }
        public Guid RestaurantId { get; init; }
        public string Email { get; init; } = string.Empty;
        public string Role { get; init; } = string.Empty;
    }

    private sealed class LoginResponseModel
    {
        public string AccessToken { get; init; } = string.Empty;
        public Guid? RestaurantId { get; init; }
    }
}

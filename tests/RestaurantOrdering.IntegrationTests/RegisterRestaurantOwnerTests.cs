using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Infrastructure.Identity;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class RegisterRestaurantOwnerTests : IClassFixture<TestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public RegisterRestaurantOwnerTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task RegisterOwner_WithValidRequest_Returns201()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient(_factory);

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register-owner",
            CreateRegisterRequest(
                "new.owner@test.local",
                "owner-restaurant"));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var payload = await response.Content.ReadFromJsonAsync<RegisterOwnerResponseModel>(JsonOptions);
        payload.Should().NotBeNull();
        payload!.Email.Should().Be("new.owner@test.local");
        payload.Role.Should().Be(ApplicationRoles.RestaurantOwner);
        payload.UserId.Should().NotBe(Guid.Empty);
        payload.RestaurantId.Should().NotBe(Guid.Empty);

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        var user = await userManager.FindByIdAsync(payload.UserId.ToString());
        user.Should().NotBeNull();
        user!.RestaurantId.Should().Be(payload.RestaurantId);
        (await userManager.IsInRoleAsync(user, ApplicationRoles.RestaurantOwner)).Should().BeTrue();

        var restaurant = await dbContext.Restaurants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.Id == payload.RestaurantId);
        restaurant.Should().NotBeNull();
        restaurant!.Slug.Should().Be("owner-restaurant");
        restaurant.NameAr.Should().Be("مطعمي");
    }

    [Fact]
    public async Task RegisterOwner_ThenLogin_Returns200AndOwnerRoleClaim()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient(_factory);

        const string email = "owner.login@test.local";
        const string password = "StrongPassword@123";
        var registerResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/register-owner",
            CreateRegisterRequest(email, "login-owner", password));
        registerResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var loginResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { Email = email, Password = password });

        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<LoginResponseModel>(JsonOptions);
        loginPayload.Should().NotBeNull();
        loginPayload!.RestaurantId.Should().NotBeNull();
        GetRoleClaims(loginPayload.AccessToken).Should().Contain(ApplicationRoles.RestaurantOwner);
    }

    [Fact]
    public async Task RegisterOwner_WithDuplicateEmail_Returns409()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient(_factory);

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register-owner",
            CreateRegisterRequest(TestDataSeeder.OwnerAEmail, "unique-restaurant"));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task RegisterOwner_WithDuplicateSlug_Returns409()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient(_factory);

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register-owner",
            CreateRegisterRequest("unique.owner@test.local", "Restaurant-A"));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task RegisterOwner_CannotChooseRoleBecauseContractHasNoRole()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient(_factory);

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register-owner",
            new
            {
                Email = "fixed.role.owner@test.local",
                Password = "StrongPassword@123",
                FullName = "Fixed Role Owner",
                PhoneNumber = (string?)null,
                RestaurantNameAr = "مطعم ثابت",
                RestaurantNameEn = "Fixed Restaurant",
                Slug = "fixed-role-restaurant",
                Role = "SuperAdmin"
            });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var payload = await response.Content.ReadFromJsonAsync<RegisterOwnerResponseModel>(JsonOptions);
        payload.Should().NotBeNull();
        payload!.Role.Should().Be(ApplicationRoles.RestaurantOwner);
    }

    [Fact]
    public async Task RegisterOwner_ExceedingRateLimit_Returns429()
    {
        using var isolatedFactory = TestWebApplicationFactory.CreateWithStrictRateLimits();
        await TestDataSeeder.SeedAsync(isolatedFactory.Services);
        using var client = CreateHttpsClient(isolatedFactory);

        for (var attempt = 1; attempt <= 5; attempt++)
        {
            var success = await client.PostAsJsonAsync(
                "/api/v1/auth/register-owner",
                CreateRegisterRequest(
                    $"rate.owner.{attempt}@test.local",
                    $"rate-owner-{attempt}"));

            success.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        var limitedResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/register-owner",
            CreateRegisterRequest("rate.owner.exceeded@test.local", "rate-owner-exceeded"));

        limitedResponse.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        var problem = await limitedResponse.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        problem.Should().NotBeNull();
        problem!.Status.Should().Be(StatusCodes.Status429TooManyRequests);
        problem.Title.Should().Be("Too many requests.");
    }

    [Fact]
    public async Task RegisterOwner_WhenUserCreationFails_DoesNotLeaveOrphanRestaurant()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient(_factory);

        const string email = "weak.password.owner@test.local";
        const string slug = "orphan-restaurant";

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register-owner",
            CreateRegisterRequest(email, slug, "123"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        (await dbContext.Restaurants.AnyAsync(item => item.Slug == slug)).Should().BeFalse();
        (await userManager.FindByEmailAsync(email)).Should().BeNull();
    }

    private static object CreateRegisterRequest(string email, string slug, string password = "StrongPassword@123") =>
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

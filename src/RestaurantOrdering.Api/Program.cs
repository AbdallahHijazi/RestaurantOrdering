using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Hosting;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application;
using RestaurantOrdering.Api.Extensions;
using RestaurantOrdering.Api.Services;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Infrastructure.Authentication;
using RestaurantOrdering.Infrastructure;
using RestaurantOrdering.Infrastructure.Persistence.Seed;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration, builder.Environment.ContentRootPath);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

builder.Services
    .AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<Microsoft.Extensions.Options.IOptions<JwtOptions>>((jwtBearerOptions, jwtOptionsAccessor) =>
    {
        var jwtOptions = jwtOptionsAccessor.Value;

        if (string.IsNullOrWhiteSpace(jwtOptions.Issuer))
        {
            throw new InvalidOperationException("Jwt:Issuer must be configured.");
        }

        if (string.IsNullOrWhiteSpace(jwtOptions.Audience))
        {
            throw new InvalidOperationException("Jwt:Audience must be configured.");
        }

        if (!JwtSigningKeyHelper.TryGetSigningKeyBytes(jwtOptions.SigningKey, out var signingKeyBytes))
        {
            throw new InvalidOperationException("Jwt:SigningKey must be configured with at least 32 bytes.");
        }

        jwtBearerOptions.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(signingKeyBytes),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(ApplicationPolicies.RestaurantOwnerOnly, policy =>
        policy.RequireRole(ApplicationRoles.RestaurantOwner));

    options.AddPolicy(ApplicationPolicies.RestaurantDashboardAccess, policy =>
        policy.RequireRole(
            ApplicationRoles.RestaurantOwner,
            ApplicationRoles.RestaurantManager));

    options.AddPolicy(ApplicationPolicies.KitchenDashboardAccess, policy =>
        policy.RequireRole(
            ApplicationRoles.RestaurantOwner,
            ApplicationRoles.RestaurantManager,
            ApplicationRoles.KitchenManager));
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, cancellationToken) =>
    {
        var httpContext = context.HttpContext;

        httpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        httpContext.Response.ContentType = "application/problem+json";

        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status429TooManyRequests,
            Title = "Too many requests.",
            Detail = "Too many requests. Please try again later.",
            Instance = httpContext.Request.Path
        };

        problemDetails.Extensions["traceId"] = httpContext.TraceIdentifier;

        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
    };

    options.AddPolicy("public-read", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    options.AddPolicy("public-order", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    options.AddPolicy("admin-upload", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    options.AddPolicy("auth-login", httpContext =>
    {
        var configuration = httpContext.RequestServices.GetRequiredService<IConfiguration>();
        var hostEnvironment = httpContext.RequestServices.GetRequiredService<IHostEnvironment>();
        var useRelaxedTestingRateLimits =
            hostEnvironment.IsEnvironment("Testing") &&
            !configuration.GetValue<bool>("Testing:UseStrictRateLimits");

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = useRelaxedTestingRateLimits ? 1000 : 8,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });

    options.AddPolicy("register-owner", httpContext =>
    {
        var configuration = httpContext.RequestServices.GetRequiredService<IConfiguration>();
        var hostEnvironment = httpContext.RequestServices.GetRequiredService<IHostEnvironment>();
        var useRelaxedTestingRateLimits =
            hostEnvironment.IsEnvironment("Testing") &&
            !configuration.GetValue<bool>("Testing:UseStrictRateLimits");

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = useRelaxedTestingRateLimits ? 1000 : 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });

    options.AddPolicy("restaurant-user-management", httpContext =>
    {
        var configuration = httpContext.RequestServices.GetRequiredService<IConfiguration>();
        var hostEnvironment = httpContext.RequestServices.GetRequiredService<IHostEnvironment>();
        var useRelaxedTestingRateLimits =
            hostEnvironment.IsEnvironment("Testing") &&
            !configuration.GetValue<bool>("Testing:UseStrictRateLimits");

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? httpContext.Connection.RemoteIpAddress?.ToString()
                ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = useRelaxedTestingRateLimits ? 1000 : 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowAnyOrigin();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
app.UseApiExceptionHandling();
if (app.Environment.IsDevelopment())
{
    app.UseDevelopmentOnlyAdminAccessGuard();
}
app.UseHttpsRedirection();

app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        context.Context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    }
});

app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();

await app.Services.InitializeApplicationRolesAsync();

if (app.Environment.IsDevelopment())
{
    await app.Services.SeedDevelopmentDataAsync();
}

app.Run();
public partial class Program;
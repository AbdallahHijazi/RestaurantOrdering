using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Infrastructure.Authentication;
using RestaurantOrdering.Infrastructure.Files;
using RestaurantOrdering.Infrastructure.Identity;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.Infrastructure.Persistence.Seed;
using RestaurantOrdering.Infrastructure.Services;

namespace RestaurantOrdering.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        string contentRootPath)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<IApplicationDbContext>(provider =>
            provider.GetRequiredService<ApplicationDbContext>());

        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(10);
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<ApplicationDbContext>();

        services.AddScoped<IUserAuthenticationService, UserAuthenticationService>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

        services.AddScoped<IDateTimeService, DateTimeService>();
        services.AddScoped<IFileStorageService>(provider =>
            new LocalFileStorageService(
                provider.GetRequiredService<IOptions<FileStorageOptions>>(),
                contentRootPath));
        services.AddScoped<DevelopmentDataSeeder>();

        services.AddOptions<FileStorageOptions>()
            .Configure(options =>
            {
                var section = configuration.GetSection(FileStorageOptions.SectionName);
                options.RootPath = section["RootPath"] ?? string.Empty;
                options.PublicBasePath = section["PublicBasePath"] ?? string.Empty;
                options.MaxFileSizeBytes = long.TryParse(section["MaxFileSizeBytes"], out var maxFileSizeBytes)
                    ? maxFileSizeBytes
                    : 0;
                options.AllowedContentTypes = section
                    .GetSection(nameof(FileStorageOptions.AllowedContentTypes))
                    .GetChildren()
                    .Select(item => item.Value)
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Select(value => value!)
                    .ToArray();
                options.AllowedExtensions = section
                    .GetSection(nameof(FileStorageOptions.AllowedExtensions))
                    .GetChildren()
                    .Select(item => item.Value)
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Select(value => value!)
                    .ToArray();
            })
            .Validate(
                options => !string.IsNullOrWhiteSpace(options.RootPath),
                "FileStorage:RootPath is required.")
            .Validate(
                options => !string.IsNullOrWhiteSpace(options.PublicBasePath),
                "FileStorage:PublicBasePath is required.")
            .Validate(
                options => options.MaxFileSizeBytes > 0,
                "FileStorage:MaxFileSizeBytes must be greater than zero.")
            .Validate(
                options => options.AllowedContentTypes is { Length: > 0 },
                "FileStorage:AllowedContentTypes must contain at least one value.")
            .Validate(
                options => options.AllowedExtensions is { Length: > 0 },
                "FileStorage:AllowedExtensions must contain at least one value.")
            .ValidateOnStart();

        services.AddOptions<JwtOptions>()
            .Configure(options =>
            {
                var section = configuration.GetSection(JwtOptions.SectionName);
                options.Issuer = section[nameof(JwtOptions.Issuer)] ?? string.Empty;
                options.Audience = section[nameof(JwtOptions.Audience)] ?? string.Empty;
                options.SigningKey = section[nameof(JwtOptions.SigningKey)] ?? string.Empty;
                options.AccessTokenLifetimeMinutes =
                    int.TryParse(section[nameof(JwtOptions.AccessTokenLifetimeMinutes)], out var lifetimeMinutes)
                        ? lifetimeMinutes
                        : 0;
            })
            .Validate(
                options => !string.IsNullOrWhiteSpace(options.Issuer),
                "Jwt:Issuer is required.")
            .Validate(
                options => !string.IsNullOrWhiteSpace(options.Audience),
                "Jwt:Audience is required.")
            .Validate(
                options => !string.IsNullOrWhiteSpace(options.SigningKey),
                "Jwt:SigningKey is required.")
            .Validate(
                options => JwtSigningKeyHelper.TryGetSigningKeyBytes(options.SigningKey, out _),
                "Jwt:SigningKey must be at least 32 bytes.")
            .Validate(
                options => options.AccessTokenLifetimeMinutes > 0 && options.AccessTokenLifetimeMinutes <= 1440,
                "Jwt:AccessTokenLifetimeMinutes must be between 1 and 1440.")
            .ValidateOnStart();

        return services;
    }
}

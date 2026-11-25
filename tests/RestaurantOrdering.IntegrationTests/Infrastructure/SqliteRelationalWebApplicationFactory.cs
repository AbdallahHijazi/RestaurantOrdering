using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using RestaurantOrdering.Infrastructure.Persistence;

namespace RestaurantOrdering.IntegrationTests.Infrastructure;

/// <summary>
/// Uses SQLite in-memory with enforced foreign keys so registration tests catch relational FK ordering bugs
/// that EF InMemory provider does not surface.
/// </summary>
public sealed class SqliteRelationalWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection;
    private readonly string _uploadsRootPath;

    public SqliteRelationalWebApplicationFactory()
    {
        _connection = new SqliteConnection("Data Source=register-owner-relational;Mode=Memory;Cache=Shared");
        _connection.Open();
        using (var command = _connection.CreateCommand())
        {
            command.CommandText = "PRAGMA foreign_keys = ON;";
            command.ExecuteNonQuery();
        }

        _uploadsRootPath = Path.Combine(
            Path.GetTempPath(),
            $"restaurant-ordering-sqlite-test-uploads-{Guid.NewGuid():N}");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            configBuilder.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["Jwt:Issuer"] = "RestaurantOrdering.Tests",
                    ["Jwt:Audience"] = "RestaurantOrdering.Tests.Client",
                    ["Jwt:SigningKey"] = "test-signing-key-at-least-32-characters-long!",
                    ["Jwt:AccessTokenLifetimeMinutes"] = "60",
                    ["FileStorage:RootPath"] = _uploadsRootPath,
                    ["Testing:UseStrictRateLimits"] = "false"
                });
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.RemoveAll<ApplicationDbContext>();
            services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();

            services.AddSingleton(_connection);
            services.AddDbContext<ApplicationDbContext>((_, options) =>
                options.UseSqlite(_connection));
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        EnsureSchemaCreated();
        return base.CreateHost(builder);
    }

    private void EnsureSchemaCreated()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var context = new ApplicationDbContext(options);
        context.Database.EnsureCreated();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            if (Directory.Exists(_uploadsRootPath))
            {
                Directory.Delete(_uploadsRootPath, recursive: true);
            }

            _connection.Dispose();
        }

        base.Dispose(disposing);
    }
}

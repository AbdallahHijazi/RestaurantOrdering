using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.PublicMenu.Queries.GetPublicMenuBySlug;
using RestaurantOrdering.Application.Features.Restaurants.Common;
using RestaurantOrdering.Application.Features.Restaurants.Queries.GetPublicRestaurantBySlug;
using RestaurantOrdering.Application.Features.Restaurants.Queries.GetRestaurantById;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Identity;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.Infrastructure.Persistence.Migrations;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class LegacyBackfillDualReadTests : IAsyncLifetime
{
    private const string FoundationMigrationId = "20260613115635_AddDynamicMultilingualFoundation";
    private const string BackfillMigrationId = "20260613121104_BackfillLegacyBilingualContentIntoTranslations";

    private readonly string _databaseName = $"RestaurantOrdering_ML7A3_{Guid.NewGuid():N}";
    private ApplicationDbContext _context = null!;

    private string ConnectionString =>
        $"Server=(localdb)\\MSSQLLocalDB;Database={_databaseName};Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";

    public async Task InitializeAsync()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlServer(ConnectionString)
            .Options;

        _context = new ApplicationDbContext(options);
        await MigrateToAsync(FoundationMigrationId);
    }

    public async Task DisposeAsync()
    {
        await _context.Database.EnsureDeletedAsync();
        await _context.DisposeAsync();
    }

    [Fact]
    public async Task Backfill_CreatesSupportedLocalesArAndEn()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: true);

        await ApplyBackfillMigrationAsync();

        var locales = await _context.RestaurantSupportedLocales
            .AsNoTracking()
            .Where(item => item.RestaurantId == restaurant.Id)
            .OrderBy(item => item.SortOrder)
            .ToListAsync();

        locales.Should().HaveCount(2);
        locales[0].LocaleCode.Should().Be("ar");
        locales[0].IsEnabled.Should().BeTrue();
        locales[0].SortOrder.Should().Be(1);
        locales[1].LocaleCode.Should().Be("en");
        locales[1].IsEnabled.Should().BeTrue();
        locales[1].SortOrder.Should().Be(2);
    }

    [Fact]
    public async Task Backfill_MigratesRestaurantArabicTranslation()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: true);

        await ApplyBackfillMigrationAsync();

        var translation = await _context.RestaurantTranslations
            .AsNoTracking()
            .SingleAsync(item => item.RestaurantId == restaurant.Id && item.LocaleCode == "ar");

        translation.Name.Should().Be("مطعم عربي");
        translation.Description.Should().Be("وصف عربي");
        translation.Address.Should().Be("عنوان عربي");
        translation.PublishedSource.Should().Be(TranslationSource.Original);
        translation.PublishedSourceVersion.Should().Be(restaurant.ContentVersion);
        translation.DraftName.Should().BeNull();
    }

    [Fact]
    public async Task Backfill_MigratesRestaurantEnglishTranslationOnlyWhenNameEnPresent()
    {
        var withEnglish = await SeedLegacyRestaurantAsync(includeEnglish: true, slugSuffix: "en-yes");
        var withoutEnglish = await SeedLegacyRestaurantAsync(includeEnglish: false, slugSuffix: "en-no");

        await ApplyBackfillMigrationAsync();

        (await _context.RestaurantTranslations
            .AnyAsync(item => item.RestaurantId == withEnglish.Id && item.LocaleCode == "en"))
            .Should().BeTrue();

        (await _context.RestaurantTranslations
            .AnyAsync(item => item.RestaurantId == withoutEnglish.Id && item.LocaleCode == "en"))
            .Should().BeFalse();
    }

    [Fact]
    public async Task Backfill_MigratesCategoryTranslations()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: true);
        var category = await SeedLegacyCategoryAsync(restaurant.Id, includeEnglish: true);

        await ApplyBackfillMigrationAsync();

        var ar = await _context.CategoryTranslations
            .AsNoTracking()
            .SingleAsync(item => item.CategoryId == category.Id && item.LocaleCode == "ar");
        ar.Name.Should().Be("فئة عربية");
        ar.Description.Should().Be("وصف فئة");

        var en = await _context.CategoryTranslations
            .AsNoTracking()
            .SingleAsync(item => item.CategoryId == category.Id && item.LocaleCode == "en");
        en.Name.Should().Be("English Category");
        en.PublishedSource.Should().Be(TranslationSource.Manual);
    }

    [Fact]
    public async Task Backfill_MigratesMenuItemTranslations()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: true);
        var category = await SeedLegacyCategoryAsync(restaurant.Id, includeEnglish: true);
        var menuItem = await SeedLegacyMenuItemAsync(restaurant.Id, category.Id, includeEnglish: true);

        await ApplyBackfillMigrationAsync();

        var ar = await _context.MenuItemTranslations
            .AsNoTracking()
            .SingleAsync(item => item.MenuItemId == menuItem.Id && item.LocaleCode == "ar");
        ar.Name.Should().Be("وجبة عربية");

        var en = await _context.MenuItemTranslations
            .AsNoTracking()
            .SingleAsync(item => item.MenuItemId == menuItem.Id && item.LocaleCode == "en");
        en.Name.Should().Be("English Item");
    }

    [Fact]
    public async Task Backfill_DoesNotCreateEnglishRowWhenNameEnMissingOrEmpty()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: false);
        var category = await SeedLegacyCategoryAsync(restaurant.Id, includeEnglish: false);
        var menuItem = await SeedLegacyMenuItemAsync(restaurant.Id, category.Id, includeEnglish: false);

        await ApplyBackfillMigrationAsync();

        (await _context.RestaurantTranslations.CountAsync(item => item.LocaleCode == "en")).Should().Be(0);
        (await _context.CategoryTranslations.CountAsync(item => item.CategoryId == category.Id && item.LocaleCode == "en")).Should().Be(0);
        (await _context.MenuItemTranslations.CountAsync(item => item.MenuItemId == menuItem.Id && item.LocaleCode == "en")).Should().Be(0);
    }

    [Fact]
    public async Task Backfill_IsIdempotentWhenSqlIsReExecuted()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: true);
        var category = await SeedLegacyCategoryAsync(restaurant.Id, includeEnglish: true);
        var menuItem = await SeedLegacyMenuItemAsync(restaurant.Id, category.Id, includeEnglish: true);

        await ApplyBackfillMigrationAsync();

        var countsAfterFirstRun = await GetBackfillCountsAsync(restaurant.Id, category.Id, menuItem.Id);

        await ReExecuteBackfillSqlAsync();

        var countsAfterSecondRun = await GetBackfillCountsAsync(restaurant.Id, category.Id, menuItem.Id);
        countsAfterSecondRun.Should().BeEquivalentTo(countsAfterFirstRun);
    }

    [Fact]
    public async Task Backfill_DoesNotOverwriteExistingTranslationRows()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: true);
        var category = await SeedLegacyCategoryAsync(restaurant.Id, includeEnglish: true);
        var menuItem = await SeedLegacyMenuItemAsync(restaurant.Id, category.Id, includeEnglish: true);

        _context.RestaurantTranslations.Add(new RestaurantTranslation
        {
            RestaurantId = restaurant.Id,
            LocaleCode = "ar",
            Name = "Existing Arabic Name",
            PublishedSource = TranslationSource.Manual,
            PublishedSourceVersion = 99,
            CreatedAt = DateTime.UtcNow
        });

        _context.CategoryTranslations.Add(new CategoryTranslation
        {
            CategoryId = category.Id,
            LocaleCode = "ar",
            Name = "Existing Category Name",
            PublishedSource = TranslationSource.Manual,
            PublishedSourceVersion = 99,
            CreatedAt = DateTime.UtcNow
        });

        _context.MenuItemTranslations.Add(new MenuItemTranslation
        {
            MenuItemId = menuItem.Id,
            LocaleCode = "ar",
            Name = "Existing Item Name",
            PublishedSource = TranslationSource.Manual,
            PublishedSourceVersion = 99,
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        await ApplyBackfillMigrationAsync();

        (await _context.RestaurantTranslations
            .Where(item => item.RestaurantId == restaurant.Id && item.LocaleCode == "ar")
            .Select(item => item.Name)
            .SingleAsync()).Should().Be("Existing Arabic Name");

        (await _context.CategoryTranslations
            .Where(item => item.CategoryId == category.Id && item.LocaleCode == "ar")
            .Select(item => item.Name)
            .SingleAsync()).Should().Be("Existing Category Name");

        (await _context.MenuItemTranslations
            .Where(item => item.MenuItemId == menuItem.Id && item.LocaleCode == "ar")
            .Select(item => item.Name)
            .SingleAsync()).Should().Be("Existing Item Name");
    }

    [Fact]
    public async Task Backfill_SkipsSoftDeletedEntities()
    {
        var activeRestaurant = await SeedLegacyRestaurantAsync(includeEnglish: true, slugSuffix: "active");
        var deletedRestaurant = await SeedLegacyRestaurantAsync(includeEnglish: true, slugSuffix: "deleted", isDeleted: true);

        await ApplyBackfillMigrationAsync();

        (await _context.RestaurantSupportedLocales.CountAsync(item => item.RestaurantId == activeRestaurant.Id)).Should().Be(2);
        (await _context.RestaurantSupportedLocales.CountAsync(item => item.RestaurantId == deletedRestaurant.Id)).Should().Be(0);
        (await _context.RestaurantTranslations.CountAsync(item => item.RestaurantId == deletedRestaurant.Id)).Should().Be(0);
    }

    [Fact]
    public async Task DualRead_PrefersPublishedTranslationOverLegacyColumns()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: true);
        var category = await SeedLegacyCategoryAsync(restaurant.Id, includeEnglish: true);
        var menuItem = await SeedLegacyMenuItemAsync(restaurant.Id, category.Id, includeEnglish: true);

        await ApplyBackfillMigrationAsync();

        var restaurantAr = await _context.RestaurantTranslations.SingleAsync(item => item.RestaurantId == restaurant.Id && item.LocaleCode == "ar");
        restaurantAr.Name = "Published Restaurant Arabic";
        restaurantAr.Description = "Published Description Arabic";
        restaurantAr.Address = "Published Address Arabic";

        var categoryAr = await _context.CategoryTranslations.SingleAsync(item => item.CategoryId == category.Id && item.LocaleCode == "ar");
        categoryAr.Name = "Published Category Arabic";

        var menuItemAr = await _context.MenuItemTranslations.SingleAsync(item => item.MenuItemId == menuItem.Id && item.LocaleCode == "ar");
        menuItemAr.Name = "Published Item Arabic";

        await _context.SaveChangesAsync();

        var restaurantDto = await new GetRestaurantByIdQueryHandler(_context)
            .Handle(new GetRestaurantByIdQuery(restaurant.Id), CancellationToken.None);

        restaurantDto.NameAr.Should().Be("Published Restaurant Arabic");
        restaurantDto.DescriptionAr.Should().Be("Published Description Arabic");
        restaurantDto.AddressAr.Should().Be("Published Address Arabic");

        var publicRestaurant = await new GetPublicRestaurantBySlugQueryHandler(_context)
            .Handle(new GetPublicRestaurantBySlugQuery(restaurant.Slug), CancellationToken.None);

        publicRestaurant.NameAr.Should().Be("Published Restaurant Arabic");

        var publicMenu = await new GetPublicMenuBySlugQueryHandler(_context, new PublicLocaleResolver())
            .Handle(new GetPublicMenuBySlugQuery(restaurant.Slug), CancellationToken.None);

        publicMenu.Categories.Single().NameAr.Should().Be("Published Category Arabic");
        publicMenu.Categories.Single().Items.Single().NameAr.Should().Be("Published Item Arabic");
    }

    [Fact]
    public async Task DualRead_FallsBackToLegacyWhenTranslationRowMissing()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: true);
        await ApplyBackfillMigrationAsync();

        await _context.RestaurantTranslations
            .Where(item => item.RestaurantId == restaurant.Id)
            .ExecuteDeleteAsync();

        var dto = await new GetRestaurantByIdQueryHandler(_context)
            .Handle(new GetRestaurantByIdQuery(restaurant.Id), CancellationToken.None);

        dto.NameAr.Should().Be("مطعم عربي");
        dto.NameEn.Should().Be("English Restaurant");
        dto.DescriptionAr.Should().Be("وصف عربي");
        dto.AddressAr.Should().Be("عنوان عربي");
    }

    [Fact]
    public async Task DualRead_DraftOnlyRowDoesNotSurfaceInResolvedRead()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: false);
        await ApplyBackfillMigrationAsync();

        await _context.RestaurantTranslations
            .Where(item => item.RestaurantId == restaurant.Id)
            .ExecuteDeleteAsync();

        _context.RestaurantTranslations.Add(new RestaurantTranslation
        {
            RestaurantId = restaurant.Id,
            LocaleCode = "ar",
            Name = null,
            DraftName = "Draft Arabic Only",
            DraftStatus = TranslationStatus.NeedsReview,
            DraftSource = TranslationSource.Machine,
            DraftSourceVersion = 1,
            DraftGeneratedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        var dto = await new GetRestaurantByIdQueryHandler(_context)
            .Handle(new GetRestaurantByIdQuery(restaurant.Id), CancellationToken.None);

        dto.NameAr.Should().Be("مطعم عربي");
    }

    [Fact]
    public async Task DualRead_UsesPublishedFieldsWhenDraftAlsoPresent()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: false);
        await ApplyBackfillMigrationAsync();

        var translation = await _context.RestaurantTranslations
            .SingleAsync(item => item.RestaurantId == restaurant.Id && item.LocaleCode == "ar");

        translation.Name = "Published Arabic";
        translation.DraftName = "Draft Arabic";
        translation.DraftStatus = TranslationStatus.NeedsReview;
        translation.DraftSource = TranslationSource.Machine;
        translation.DraftSourceVersion = 1;
        translation.DraftGeneratedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var dto = restaurant.ToDto(
            arTranslation: translation,
            enTranslation: null);

        dto.NameAr.Should().Be("Published Arabic");
    }

    [Fact]
    public void ModelSnapshot_StillContainsLegacyBilingualColumns()
    {
        var snapshot = File.ReadAllText(FindRepositoryRootPath(
            "src",
            "RestaurantOrdering.Infrastructure",
            "Persistence",
            "Migrations",
            "ApplicationDbContextModelSnapshot.cs"));

        snapshot.Should().Contain("NameAr");
        snapshot.Should().Contain("NameEn");
        snapshot.Should().Contain("DescriptionAr");
        snapshot.Should().Contain("DescriptionEn");
        snapshot.Should().Contain("AddressAr");
        snapshot.Should().Contain("AddressEn");
    }

    [Fact]
    public void FoundationMigration_FileIsUnchangedFromCommittedBaseline()
    {
        var migrationPath = Directory
            .GetFiles(
                Path.Combine(FindRepositoryRoot(), "src", "RestaurantOrdering.Infrastructure", "Persistence", "Migrations"),
                "*AddDynamicMultilingualFoundation.cs")
            .Single(path => !path.EndsWith(".Designer.cs", StringComparison.Ordinal));

        var migration = File.ReadAllText(migrationPath);
        migration.Should().Contain("AddDynamicMultilingualFoundation");
        migration.Should().NotContain("BackfillLegacyBilingualContentIntoTranslations");
    }

    [Fact]
    public void BackfillMigration_IsDataOnlyWithoutSchemaChanges()
    {
        var migrationPath = Directory
            .GetFiles(
                Path.Combine(FindRepositoryRoot(), "src", "RestaurantOrdering.Infrastructure", "Persistence", "Migrations"),
                "*BackfillLegacyBilingualContentIntoTranslations.cs")
            .Single(path => !path.EndsWith(".Designer.cs", StringComparison.Ordinal));

        var migration = File.ReadAllText(migrationPath);
        var upMethod = migration.Split("protected override void Down", StringSplitOptions.None)[0];

        upMethod.Should().NotContain("DropColumn");
        upMethod.Should().NotContain("DropTable");
        upMethod.Should().NotContain("AddColumn");
        upMethod.Should().NotContain("CreateTable");
        upMethod.Should().Contain("LegacyBilingualBackfillMigrationSql");
    }

    [Fact]
    public void PublishedTranslationDualRead_ResolvesPublishedBeforeLegacy()
    {
        PublishedTranslationDualRead.ResolveRequired("Published", "Legacy").Should().Be("Published");
        PublishedTranslationDualRead.ResolveRequired(null, "Legacy").Should().Be("Legacy");
        PublishedTranslationDualRead.ResolveOptional("Published", "Legacy").Should().Be("Published");
        PublishedTranslationDualRead.ResolveOptional(null, "Legacy").Should().Be("Legacy");
        PublishedTranslationDualRead.ResolveOptional("  ", null).Should().BeNull();
    }

    private async Task ApplyBackfillMigrationAsync() =>
        await MigrateToAsync(BackfillMigrationId);

    private async Task MigrateToAsync(string migrationId)
    {
        var migrator = _context.Database.GetService<IMigrator>();
        await migrator.MigrateAsync(migrationId);
    }

    private async Task ReExecuteBackfillSqlAsync()
    {
        foreach (var statement in LegacyBilingualBackfillMigrationSql.AllBackfillStatements)
        {
            await _context.Database.ExecuteSqlRawAsync(statement);
        }
    }

    private async Task<(int SupportedLocales, int RestaurantTranslations, int CategoryTranslations, int MenuItemTranslations)> GetBackfillCountsAsync(
        Guid restaurantId,
        Guid categoryId,
        Guid menuItemId)
    {
        return (
            await _context.RestaurantSupportedLocales.CountAsync(item => item.RestaurantId == restaurantId),
            await _context.RestaurantTranslations.CountAsync(item => item.RestaurantId == restaurantId),
            await _context.CategoryTranslations.CountAsync(item => item.CategoryId == categoryId),
            await _context.MenuItemTranslations.CountAsync(item => item.MenuItemId == menuItemId));
    }

    private async Task<Restaurant> SeedLegacyRestaurantAsync(
        bool includeEnglish,
        string slugSuffix = "main",
        bool isDeleted = false)
    {
        var ownerId = Guid.NewGuid();
        var suffix = $"{slugSuffix}-{Guid.NewGuid():N}"[..16];

        _context.Users.Add(new ApplicationUser
        {
            Id = ownerId,
            UserName = $"owner-{suffix}@test.local",
            NormalizedUserName = $"OWNER-{suffix}@TEST.LOCAL",
            Email = $"owner-{suffix}@test.local",
            NormalizedEmail = $"OWNER-{suffix}@TEST.LOCAL",
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow
        });

        var restaurant = new Restaurant
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            Slug = $"slug-{suffix}",
            NameAr = "مطعم عربي",
            NameEn = includeEnglish ? "English Restaurant" : null,
            DescriptionAr = "وصف عربي",
            DescriptionEn = includeEnglish ? "English Description" : null,
            AddressAr = "عنوان عربي",
            AddressEn = includeEnglish ? "English Address" : null,
            PhoneNumber = "+0000000000",
            IsDeleted = isDeleted,
            ContentVersion = 3,
            CreatedAt = DateTime.UtcNow
        };

        _context.Restaurants.Add(restaurant);
        _context.RestaurantSettings.Add(new RestaurantSettings
        {
            Id = Guid.NewGuid(),
            RestaurantId = restaurant.Id,
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return restaurant;
    }

    private async Task<Category> SeedLegacyCategoryAsync(Guid restaurantId, bool includeEnglish)
    {
        var category = new Category
        {
            Id = Guid.NewGuid(),
            RestaurantId = restaurantId,
            NameAr = "فئة عربية",
            NameEn = includeEnglish ? "English Category" : null,
            DescriptionAr = "وصف فئة",
            DescriptionEn = includeEnglish ? "Category Description" : null,
            ContentVersion = 2,
            CreatedAt = DateTime.UtcNow
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();
        return category;
    }

    private async Task<MenuItem> SeedLegacyMenuItemAsync(Guid restaurantId, Guid categoryId, bool includeEnglish)
    {
        var menuItem = new MenuItem
        {
            Id = Guid.NewGuid(),
            RestaurantId = restaurantId,
            CategoryId = categoryId,
            NameAr = "وجبة عربية",
            NameEn = includeEnglish ? "English Item" : null,
            DescriptionAr = "وصف وجبة",
            DescriptionEn = includeEnglish ? "Item Description" : null,
            Price = 12.5m,
            ContentVersion = 4,
            CreatedAt = DateTime.UtcNow
        };

        _context.MenuItems.Add(menuItem);
        await _context.SaveChangesAsync();
        return menuItem;
    }

    private static string FindRepositoryRootPath(params string[] segments) =>
        Path.Combine(FindRepositoryRoot(), Path.Combine(segments));

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

using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.MediaFiles.Commands.SetRestaurantCoverImage;
using RestaurantOrdering.Application.Features.MediaFiles.Commands.SetRestaurantLogo;
using RestaurantOrdering.Application.Features.MenuItems.Commands.CreateMenuItem;
using RestaurantOrdering.Application.Features.MenuItems.Commands.UpdateMenuItem;
using RestaurantOrdering.Application.Features.MenuItems.Queries.GetMenuItemById;
using RestaurantOrdering.Application.Features.Restaurants.Commands.UpdateRestaurant;
using RestaurantOrdering.Application.Features.Restaurants.Common;
using RestaurantOrdering.Application.Features.Restaurants.Queries.GetRestaurantById;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Identity;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.Infrastructure.Persistence.Migrations;
using RestaurantOrdering.Infrastructure.Services;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class StaleTranslationReadPreventionTests : IAsyncLifetime
{
    private const string FoundationMigrationId = "20260613115635_AddDynamicMultilingualFoundation";
    private const string BackfillMigrationId = "20260613121104_BackfillLegacyBilingualContentIntoTranslations";

    private readonly string _databaseName = $"RestaurantOrdering_ML7A31_{Guid.NewGuid():N}";
    private readonly IDateTimeService _dateTimeService = new DateTimeService();
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
    public async Task DualRead_UsesBackfilledTranslationWhenPublishedSourceVersionMatchesContentVersion()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: true);
        await ApplyBackfillMigrationAsync();

        var translation = await _context.RestaurantTranslations
            .AsNoTracking()
            .SingleAsync(item => item.RestaurantId == restaurant.Id && item.LocaleCode == "ar");

        var entity = await _context.Restaurants.AsNoTracking().SingleAsync(item => item.Id == restaurant.Id);
        translation.PublishedSourceVersion.Should().Be(entity.ContentVersion);

        var dto = await new GetRestaurantByIdQueryHandler(_context)
            .Handle(new GetRestaurantByIdQuery(restaurant.Id), CancellationToken.None);

        dto.NameAr.Should().Be(translation.Name);
    }

    [Fact]
    public async Task UpdateRestaurant_IncrementsContentVersionWhenNameArChanges()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: false);
        var originalVersion = restaurant.ContentVersion;

        await new UpdateRestaurantCommandHandler(_context, _dateTimeService, CreateWriter())
            .Handle(BuildRestaurantUpdateCommand(restaurant, nameAr: "اسم محدث"), CancellationToken.None);

        var updated = await _context.Restaurants.AsNoTracking().SingleAsync(item => item.Id == restaurant.Id);
        updated.ContentVersion.Should().Be(originalVersion + 1);
        updated.NameAr.Should().Be("اسم محدث");
    }

    [Fact]
    public async Task UpdateRestaurant_IncrementsContentVersionWhenDescriptionEnChanges()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: true);
        var originalVersion = restaurant.ContentVersion;

        await new UpdateRestaurantCommandHandler(_context, _dateTimeService, CreateWriter())
            .Handle(
                BuildRestaurantUpdateCommand(restaurant, descriptionEn: "Updated English description"),
                CancellationToken.None);

        var updated = await _context.Restaurants.AsNoTracking().SingleAsync(item => item.Id == restaurant.Id);
        updated.ContentVersion.Should().Be(originalVersion + 1);
        updated.DescriptionEn.Should().Be("Updated English description");
    }

    [Fact]
    public async Task UpdateMenuItem_DoesNotIncrementContentVersionWhenOnlyPriceChanges()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: false);
        var category = await SeedLegacyCategoryAsync(restaurant.Id, includeEnglish: false);
        var menuItem = await SeedLegacyMenuItemAsync(restaurant.Id, category.Id, includeEnglish: false);
        var originalVersion = menuItem.ContentVersion;
        var originalPrice = menuItem.Price;

        await new UpdateMenuItemCommandHandler(_context, _dateTimeService, CreateWriter())
            .Handle(
                BuildMenuItemUpdateCommand(menuItem, price: originalPrice + 5m),
                CancellationToken.None);

        var updated = await _context.MenuItems.AsNoTracking().SingleAsync(item => item.Id == menuItem.Id);
        updated.ContentVersion.Should().Be(originalVersion);
        updated.Price.Should().Be(originalPrice + 5m);
    }

    [Fact]
    public async Task SetRestaurantLogo_DoesNotIncrementContentVersion()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: false);
        var mediaFile = await SeedMediaFileAsync(restaurant.Id);
        var originalVersion = restaurant.ContentVersion;

        await new SetRestaurantLogoCommandHandler(_context, _dateTimeService)
            .Handle(new SetRestaurantLogoCommand(restaurant.Id, mediaFile.Id), CancellationToken.None);

        var updated = await _context.Restaurants.AsNoTracking().SingleAsync(item => item.Id == restaurant.Id);
        updated.ContentVersion.Should().Be(originalVersion);
        updated.LogoFileId.Should().Be(mediaFile.Id);
    }

    [Fact]
    public async Task SetRestaurantCoverImage_DoesNotIncrementContentVersion()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: false);
        var mediaFile = await SeedMediaFileAsync(restaurant.Id);
        var originalVersion = restaurant.ContentVersion;

        await new SetRestaurantCoverImageCommandHandler(_context, _dateTimeService)
            .Handle(new SetRestaurantCoverImageCommand(restaurant.Id, mediaFile.Id), CancellationToken.None);

        var updated = await _context.Restaurants.AsNoTracking().SingleAsync(item => item.Id == restaurant.Id);
        updated.ContentVersion.Should().Be(originalVersion);
        updated.CoverImageFileId.Should().Be(mediaFile.Id);
    }

    [Fact]
    public async Task DualRead_FallsBackToLegacyWhenTranslationRowIsStaleAfterLegacyEdit()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: false);
        await ApplyBackfillMigrationAsync();

        var staleTranslationName = (await _context.RestaurantTranslations
            .AsNoTracking()
            .SingleAsync(item => item.RestaurantId == restaurant.Id && item.LocaleCode == "ar")).Name;

        await new UpdateRestaurantCommandHandler(_context, _dateTimeService, CreateWriter())
            .Handle(BuildRestaurantUpdateCommand(restaurant, nameAr: "اسم legacy جديد"), CancellationToken.None);

        var dto = await new GetRestaurantByIdQueryHandler(_context)
            .Handle(new GetRestaurantByIdQuery(restaurant.Id), CancellationToken.None);

        dto.NameAr.Should().Be("اسم legacy جديد");
        dto.NameAr.Should().NotBe(staleTranslationName);
    }

    [Fact]
    public async Task DualRead_DraftOnlyTranslationRowDoesNotSurfaceInResolvedRead()
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
            DraftSourceVersion = restaurant.ContentVersion,
            DraftGeneratedAt = DateTime.UtcNow,
            PublishedSourceVersion = restaurant.ContentVersion,
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        var dto = await new GetRestaurantByIdQueryHandler(_context)
            .Handle(new GetRestaurantByIdQuery(restaurant.Id), CancellationToken.None);

        dto.NameAr.Should().Be("مطعم عربي");
    }

    [Fact]
    public async Task DualRead_UsesPublishedFieldsWhenDraftAlsoPresentAtSameVersion()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: false);
        await ApplyBackfillMigrationAsync();

        var translation = await _context.RestaurantTranslations
            .SingleAsync(item => item.RestaurantId == restaurant.Id && item.LocaleCode == "ar");

        translation.Name = "Published Arabic";
        translation.DraftName = "Draft Arabic";
        translation.DraftStatus = TranslationStatus.NeedsReview;
        translation.DraftSource = TranslationSource.Machine;
        translation.DraftSourceVersion = restaurant.ContentVersion;
        translation.DraftGeneratedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var entity = await _context.Restaurants.AsNoTracking().SingleAsync(item => item.Id == restaurant.Id);
        var dto = entity.ToDto(arTranslation: translation);

        dto.NameAr.Should().Be("Published Arabic");
    }

    [Fact]
    public async Task DualRead_NewMenuItemWithoutTranslationRowFallsBackToLegacy()
    {
        var restaurant = await SeedLegacyRestaurantAsync(includeEnglish: true);
        var category = await SeedLegacyCategoryAsync(restaurant.Id, includeEnglish: true);
        await ApplyBackfillMigrationAsync();

        var created = await new CreateMenuItemCommandHandler(_context, _dateTimeService, CreateWriter())
            .Handle(
                new CreateMenuItemCommand(
                    restaurant.Id,
                    category.Id,
                    ImageFileId: null,
                    NameAr: "وجبة جديدة",
                    NameEn: "New Item",
                    DescriptionAr: "وصف",
                    DescriptionEn: "Description",
                    Price: 20m,
                    DiscountPrice: null,
                    DisplayOrder: 1,
                    IsAvailable: true,
                    IsActive: true),
                CancellationToken.None);

        var fetched = await new GetMenuItemByIdQueryHandler(_context)
            .Handle(new GetMenuItemByIdQuery(created.Id, restaurant.Id), CancellationToken.None);

        fetched.NameAr.Should().Be("وجبة جديدة");
        fetched.NameEn.Should().Be("New Item");
        (await _context.MenuItemTranslations.AnyAsync(item => item.MenuItemId == created.Id)).Should().BeTrue();
    }

    private IPublishedTranslationWriter CreateWriter() =>
        new PublishedTranslationWriter(_context, _dateTimeService);

    [Fact]
    public async Task BackfillRestaurantSettingsSql_InsertsMissingSettingsWithRequiredFields()
    {
        var restaurant = await SeedRestaurantWithoutSettingsAsync();

        await _context.Database.ExecuteSqlRawAsync(LegacyBilingualBackfillMigrationSql.BackfillRestaurantSettings);

        var settings = await _context.RestaurantSettings
            .AsNoTracking()
            .SingleAsync(item => item.RestaurantId == restaurant.Id);

        settings.DefaultLocale.Should().Be("ar");
        settings.TranslationMode.Should().Be(TranslationMode.AutoGenerateDrafts);
        settings.CurrencyCode.Should().Be("USD");
        settings.TimeZone.Should().Be("UTC");
        settings.TaxRate.Should().Be(0);
        settings.DeliveryFee.Should().Be(0);
        settings.MinimumOrderAmount.Should().Be(0);
        settings.IsDeliveryEnabled.Should().BeTrue();
        settings.IsPickupEnabled.Should().BeTrue();
    }

    [Fact]
    public void PublishedTranslationDualRead_UsesTranslationOnlyWhenPublishedSourceVersionMatches()
    {
        PublishedTranslationDualRead.ResolveRequired("Translation", 2, 2, "Legacy").Should().Be("Translation");
        PublishedTranslationDualRead.ResolveRequired("Translation", 2, 3, "Legacy").Should().Be("Legacy");
        PublishedTranslationDualRead.ResolveOptional("Translation", 1, 2, "Legacy").Should().Be("Legacy");
    }

    private async Task ApplyBackfillMigrationAsync() =>
        await MigrateToAsync(BackfillMigrationId);

    private async Task MigrateToAsync(string migrationId)
    {
        var migrator = _context.Database.GetService<IMigrator>();
        await migrator.MigrateAsync(migrationId);
    }

    private static UpdateRestaurantCommand BuildRestaurantUpdateCommand(
        Restaurant restaurant,
        string? nameAr = null,
        string? nameEn = null,
        string? descriptionAr = null,
        string? descriptionEn = null,
        string? addressAr = null,
        string? addressEn = null) =>
        new(
            restaurant.Id,
            restaurant.Slug,
            nameAr ?? restaurant.NameAr,
            nameEn ?? restaurant.NameEn,
            descriptionAr ?? restaurant.DescriptionAr,
            descriptionEn ?? restaurant.DescriptionEn,
            restaurant.PhoneNumber,
            restaurant.WhatsAppNumber,
            addressAr ?? restaurant.AddressAr,
            addressEn ?? restaurant.AddressEn,
            restaurant.Latitude,
            restaurant.Longitude,
            restaurant.AccentColor);

    private static UpdateMenuItemCommand BuildMenuItemUpdateCommand(MenuItem menuItem, decimal? price = null) =>
        new(
            menuItem.Id,
            menuItem.RestaurantId,
            menuItem.CategoryId,
            menuItem.ImageFileId,
            menuItem.NameAr,
            menuItem.NameEn,
            menuItem.DescriptionAr,
            menuItem.DescriptionEn,
            price ?? menuItem.Price,
            menuItem.DiscountPrice,
            menuItem.DisplayOrder,
            menuItem.IsAvailable,
            menuItem.IsActive);

    private async Task<Restaurant> SeedLegacyRestaurantAsync(bool includeEnglish)
    {
        var ownerId = Guid.NewGuid();
        var suffix = Guid.NewGuid().ToString("N")[..8];

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

    private async Task<Restaurant> SeedRestaurantWithoutSettingsAsync()
    {
        var ownerId = Guid.NewGuid();
        var suffix = Guid.NewGuid().ToString("N")[..8];

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
            NameAr = "مطعم بدون إعدادات",
            PhoneNumber = "+0000000000",
            CreatedAt = DateTime.UtcNow
        };

        _context.Restaurants.Add(restaurant);
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

    private async Task<MediaFile> SeedMediaFileAsync(Guid restaurantId)
    {
        var mediaFile = new MediaFile
        {
            Id = Guid.NewGuid(),
            RestaurantId = restaurantId,
            FileName = "logo.png",
            StoredFileName = "logo.png",
            OriginalFileName = "logo.png",
            FileUrl = "/uploads/logo.png",
            ContentType = "image/png",
            FileSizeBytes = 100,
            CreatedAt = DateTime.UtcNow
        };

        _context.MediaFiles.Add(mediaFile);
        await _context.SaveChangesAsync();
        return mediaFile;
    }
}

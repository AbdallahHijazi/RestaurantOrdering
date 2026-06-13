using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Features.Categories.Commands.CreateCategory;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class CatalogDualWriteTests : IClassFixture<TestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public CatalogDualWriteTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CreateCategory_PersistsLegacyAndPublishedTranslations()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories",
            CreateCategoryPayload("فئة جديدة", "New Category", "وصف", "Description", 5));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<CategoryResponse>(JsonOptions);
        created!.NameAr.Should().Be("فئة جديدة");
        created.NameEn.Should().Be("New Category");

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var category = await context.Categories.AsNoTracking().SingleAsync(item => item.Id == created.Id);
        category.ContentVersion.Should().Be(1);

        var arTranslation = await context.CategoryTranslations
            .AsNoTracking()
            .SingleAsync(item => item.CategoryId == created.Id && item.LocaleCode == "ar");
        arTranslation.Name.Should().Be("فئة جديدة");
        arTranslation.Description.Should().Be("وصف");
        arTranslation.PublishedSourceVersion.Should().Be(1);
        arTranslation.PublishedSource.Should().Be(TranslationSource.Original);

        var enTranslation = await context.CategoryTranslations
            .AsNoTracking()
            .SingleAsync(item => item.CategoryId == created.Id && item.LocaleCode == "en");
        enTranslation.Name.Should().Be("New Category");
        enTranslation.PublishedSource.Should().Be(TranslationSource.Manual);
    }

    [Fact]
    public async Task CreateMenuItem_PersistsLegacyAndPublishedTranslations()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items",
            CreateMenuItemPayload("صنف جديد", "New Item", "وصف", "Description", 30m));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<MenuItemResponse>(JsonOptions);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var menuItem = await context.MenuItems.AsNoTracking().SingleAsync(item => item.Id == created!.Id);
        menuItem.ContentVersion.Should().Be(1);

        (await context.MenuItemTranslations.CountAsync(item => item.MenuItemId == created!.Id)).Should().Be(2);
    }

    [Fact]
    public async Task CreateCategory_WithoutNameEn_DoesNotCreateEnglishTranslationRow()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories",
            CreateCategoryPayload("فئة عربية فقط", null, null, null, 6));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<CategoryResponse>(JsonOptions);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await context.CategoryTranslations.AnyAsync(item => item.CategoryId == created!.Id && item.LocaleCode == "en"))
            .Should().BeFalse();
    }

    [Fact]
    public async Task UpdateCategory_NameAr_BumpsContentVersionAndUpdatesPublishedTranslation()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories",
            CreateCategoryPayload("فئة", "Category", null, null, 7));
        var created = await createResponse.Content.ReadFromJsonAsync<CategoryResponse>(JsonOptions);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories/{created!.Id}",
            CreateCategoryPayload("فئة محدثة", "Category", null, null, 7));

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var category = await context.Categories.AsNoTracking().SingleAsync(item => item.Id == created.Id);
        category.ContentVersion.Should().Be(2);
        category.NameAr.Should().Be("فئة محدثة");

        var arTranslation = await context.CategoryTranslations
            .AsNoTracking()
            .SingleAsync(item => item.CategoryId == created.Id && item.LocaleCode == "ar");
        arTranslation.Name.Should().Be("فئة محدثة");
        arTranslation.PublishedSourceVersion.Should().Be(2);
        arTranslation.PublishedSource.Should().Be(TranslationSource.Manual);
    }

    [Fact]
    public async Task UpdateMenuItem_DescriptionEn_BumpsContentVersionAndUpdatesEnglishTranslation()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items",
            CreateMenuItemPayload("صنف", "Item", "وصف", "Old description", 20m));
        var created = await createResponse.Content.ReadFromJsonAsync<MenuItemResponse>(JsonOptions);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items/{created!.Id}",
            CreateMenuItemPayload("صنف", "Item", "وصف", "Updated English description", 20m));

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var menuItem = await context.MenuItems.AsNoTracking().SingleAsync(item => item.Id == created.Id);
        menuItem.ContentVersion.Should().Be(2);

        var enTranslation = await context.MenuItemTranslations
            .AsNoTracking()
            .SingleAsync(item => item.MenuItemId == created.Id && item.LocaleCode == "en");
        enTranslation.Description.Should().Be("Updated English description");
        enTranslation.PublishedSourceVersion.Should().Be(2);
    }

    [Fact]
    public async Task UpdateRestaurant_UpdatesPublishedTranslationRows()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}",
            CreateRestaurantPayload(
                nameAr: "مطعم محدث",
                nameEn: "Updated Restaurant",
                descriptionAr: "وصف محدث",
                addressAr: "عنوان محدث"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var restaurant = await context.Restaurants.AsNoTracking().SingleAsync(item => item.Id == TestDataSeeder.RestaurantAId);
        restaurant.ContentVersion.Should().BeGreaterThan(1);

        var arTranslation = await context.RestaurantTranslations
            .AsNoTracking()
            .SingleAsync(item => item.RestaurantId == TestDataSeeder.RestaurantAId && item.LocaleCode == "ar");
        arTranslation.Name.Should().Be("مطعم محدث");
        arTranslation.Description.Should().Be("وصف محدث");
        arTranslation.Address.Should().Be("عنوان محدث");
        arTranslation.PublishedSourceVersion.Should().Be(restaurant.ContentVersion);
    }

    [Fact]
    public async Task UpdateMenuItem_PriceOnly_DoesNotBumpContentVersionOrTranslations()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items",
            CreateMenuItemPayload("صنف", "Item", null, null, 20m));
        var created = await createResponse.Content.ReadFromJsonAsync<MenuItemResponse>(JsonOptions);

        int versionBefore;
        int publishedVersionBefore;
        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var menuItem = await context.MenuItems.AsNoTracking().SingleAsync(item => item.Id == created!.Id);
            versionBefore = menuItem.ContentVersion;
            publishedVersionBefore = (await context.MenuItemTranslations
                .AsNoTracking()
                .SingleAsync(item => item.MenuItemId == created.Id && item.LocaleCode == "ar")).PublishedSourceVersion!.Value;
        }

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/menu-items/{created!.Id}",
            CreateMenuItemPayload("صنف", "Item", null, null, 35m));

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyContext = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var updated = await verifyContext.MenuItems.AsNoTracking().SingleAsync(item => item.Id == created.Id);
        updated.ContentVersion.Should().Be(versionBefore);
        updated.Price.Should().Be(35m);

        var arTranslation = await verifyContext.MenuItemTranslations
            .AsNoTracking()
            .SingleAsync(item => item.MenuItemId == created.Id && item.LocaleCode == "ar");
        arTranslation.PublishedSourceVersion.Should().Be(publishedVersionBefore);
    }

    [Fact]
    public async Task UpdateCategory_DisplayOrderOnly_DoesNotBumpContentVersion()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories",
            CreateCategoryPayload("فئة", "Category", null, null, 1));
        var created = await createResponse.Content.ReadFromJsonAsync<CategoryResponse>(JsonOptions);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories/{created!.Id}",
            CreateCategoryPayload("فئة", "Category", null, null, 9, isActive: false));

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var category = await context.Categories.AsNoTracking().SingleAsync(item => item.Id == created.Id);
        category.ContentVersion.Should().Be(1);
        category.DisplayOrder.Should().Be(9);
        category.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task SetRestaurantLogo_DoesNotChangeTranslations()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var countsBefore = await GetRestaurantTranslationSnapshotAsync();

        var uploadResponse = await UploadPngAsync(client, TestDataSeeder.RestaurantAId);
        uploadResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var uploaded = await uploadResponse.Content.ReadFromJsonAsync<UploadedMediaResponse>(JsonOptions);

        var setLogoResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/logo",
            new { MediaFileId = uploaded!.Id });
        setLogoResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var countsAfter = await GetRestaurantTranslationSnapshotAsync();
        countsAfter.Should().BeEquivalentTo(countsBefore);
    }

    [Fact]
    public async Task UpdateCategory_ClearingNameEn_DoesNotDeleteExistingEnglishTranslation()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories",
            CreateCategoryPayload("فئة", "English Name", null, null, 3));
        var created = await createResponse.Content.ReadFromJsonAsync<CategoryResponse>(JsonOptions);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories/{created!.Id}",
            CreateCategoryPayload("فئة", null, null, null, 3));

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var enTranslation = await context.CategoryTranslations
            .AsNoTracking()
            .SingleAsync(item => item.CategoryId == created.Id && item.LocaleCode == "en");
        enTranslation.Name.Should().Be("English Name");
    }

    [Fact]
    public async Task UpdateCategory_WithExistingDraft_DoesNotPublishOrDeleteDraft()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories",
            CreateCategoryPayload("فئة", "Category", null, null, 4));
        var created = await createResponse.Content.ReadFromJsonAsync<CategoryResponse>(JsonOptions);

        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var translation = await context.CategoryTranslations
                .SingleAsync(item => item.CategoryId == created!.Id && item.LocaleCode == "ar");
            translation.DraftName = "Draft Arabic";
            translation.DraftStatus = TranslationStatus.NeedsReview;
            translation.DraftSource = TranslationSource.Machine;
            translation.DraftSourceVersion = 1;
            translation.DraftGeneratedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
        }

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories/{created!.Id}",
            CreateCategoryPayload("فئة محدثة", "Category", null, null, 4));
        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyContext = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var arTranslation = await verifyContext.CategoryTranslations
            .AsNoTracking()
            .SingleAsync(item => item.CategoryId == created.Id && item.LocaleCode == "ar");
        arTranslation.Name.Should().Be("فئة محدثة");
        arTranslation.DraftName.Should().Be("Draft Arabic");
        arTranslation.DraftStatus.Should().Be(TranslationStatus.NeedsReview);
    }

    [Fact]
    public async Task CreateCategory_WhenDefaultLocaleIsFrench_Returns400WithoutPersistingCategory()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SetDefaultLocaleAsync(TestDataSeeder.RestaurantAId, "fr");

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var countBefore = await CountCategoriesAsync();
        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories",
            CreateCategoryPayload("فئة", "Category", null, null, 1));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await CountCategoriesAsync()).Should().Be(countBefore);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("DefaultLocale");
    }

    [Fact]
    public async Task RegisterOwner_CreatesSupportedLocalesAndRestaurantTranslations()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register-owner",
            new
            {
                Email = "dualwrite.owner@test.local",
                Password = TestDataSeeder.CorrectPassword,
                FullName = "Dual Write Owner",
                PhoneNumber = "+15555550101",
                RestaurantNameAr = "مطعم جديد",
                RestaurantNameEn = "New Restaurant",
                Slug = "dual-write-restaurant"
            });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var payload = await response.Content.ReadFromJsonAsync<RegisterOwnerResponse>(JsonOptions);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        (await context.RestaurantSettings.AnyAsync(item => item.RestaurantId == payload!.RestaurantId)).Should().BeTrue();

        var supportedLocales = await context.RestaurantSupportedLocales
            .AsNoTracking()
            .Where(item => item.RestaurantId == payload.RestaurantId)
            .OrderBy(item => item.SortOrder)
            .ToListAsync();
        supportedLocales.Should().HaveCount(2);
        supportedLocales.Select(item => item.LocaleCode).Should().Equal("ar", "en");

        var arTranslation = await context.RestaurantTranslations
            .AsNoTracking()
            .SingleAsync(item => item.RestaurantId == payload.RestaurantId && item.LocaleCode == "ar");
        arTranslation.Name.Should().Be("مطعم جديد");
        arTranslation.PublishedSource.Should().Be(TranslationSource.Original);

        var enTranslation = await context.RestaurantTranslations
            .AsNoTracking()
            .SingleAsync(item => item.RestaurantId == payload.RestaurantId && item.LocaleCode == "en");
        enTranslation.Name.Should().Be("New Restaurant");
        enTranslation.PublishedSource.Should().Be(TranslationSource.Manual);
    }

    [Fact]
    public async Task DualRead_AfterCategoryUpdate_UsesCurrentPublishedTranslation()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories",
            CreateCategoryPayload("فئة قديمة", "Old Category", null, null, 1));
        var created = await createResponse.Content.ReadFromJsonAsync<CategoryResponse>(JsonOptions);

        await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories/{created!.Id}",
            CreateCategoryPayload("فئة حديثة", "Old Category", null, null, 1));

        var getResponse = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories/{created.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var fetched = await getResponse.Content.ReadFromJsonAsync<CategoryResponse>(JsonOptions);
        fetched!.NameAr.Should().Be("فئة حديثة");

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var category = await context.Categories.AsNoTracking().SingleAsync(item => item.Id == created.Id);
        var arTranslation = await context.CategoryTranslations
            .AsNoTracking()
            .SingleAsync(item => item.CategoryId == created.Id && item.LocaleCode == "ar");

        PublishedTranslationDualRead.ResolveRequired(
            arTranslation.Name,
            arTranslation.PublishedSourceVersion,
            category.ContentVersion,
            category.NameAr).Should().Be("فئة حديثة");
    }

    [Fact]
    public async Task CreateCategory_WhenTranslationUpsertFails_DoesNotPersistLegacyCategory()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var dateTimeService = scope.ServiceProvider.GetRequiredService<IDateTimeService>();
        var innerWriter = scope.ServiceProvider.GetRequiredService<IPublishedTranslationWriter>();
        var failingWriter = new FailingCategoryTranslationWriter(innerWriter);
        var handler = new CreateCategoryCommandHandler(context, dateTimeService, failingWriter);

        var countBefore = await CountCategoriesAsync();

        var act = async () => await handler.Handle(
            new CreateCategoryCommand(
                TestDataSeeder.RestaurantAId,
                "فئة فاشلة",
                "Failed Category",
                null,
                null,
                10,
                true),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Simulated translation persistence failure*");

        (await CountCategoriesAsync()).Should().Be(countBefore);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyContext = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await verifyContext.Categories.AnyAsync(item =>
            item.RestaurantId == TestDataSeeder.RestaurantAId && item.NameAr == "فئة فاشلة")).Should().BeFalse();
    }

    private async Task<int> CountCategoriesAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await context.Categories.CountAsync(item => item.RestaurantId == TestDataSeeder.RestaurantAId);
    }

    private sealed class FailingCategoryTranslationWriter : IPublishedTranslationWriter
    {
        private readonly IPublishedTranslationWriter _inner;

        public FailingCategoryTranslationWriter(IPublishedTranslationWriter inner)
        {
            _inner = inner;
        }

        public Task EnsureLegacyBilingualWriteSupportedAsync(Guid restaurantId, CancellationToken cancellationToken) =>
            _inner.EnsureLegacyBilingualWriteSupportedAsync(restaurantId, cancellationToken);

        public Task InitializeRegistrationCatalogAsync(Restaurant restaurant, CancellationToken cancellationToken) =>
            _inner.InitializeRegistrationCatalogAsync(restaurant, cancellationToken);

        public Task UpsertRestaurantPublishedTranslationsAsync(
            Restaurant restaurant,
            bool isManualEdit,
            CancellationToken cancellationToken) =>
            _inner.UpsertRestaurantPublishedTranslationsAsync(restaurant, isManualEdit, cancellationToken);

        public Task UpsertCategoryPublishedTranslationsAsync(
            Category category,
            bool isManualEdit,
            CancellationToken cancellationToken) =>
            throw new InvalidOperationException("Simulated translation persistence failure.");

        public Task UpsertMenuItemPublishedTranslationsAsync(
            MenuItem menuItem,
            bool isManualEdit,
            CancellationToken cancellationToken) =>
            _inner.UpsertMenuItemPublishedTranslationsAsync(menuItem, isManualEdit, cancellationToken);

        public Task<string> GetRestaurantDefaultLocaleAsync(Guid restaurantId, CancellationToken cancellationToken) =>
            _inner.GetRestaurantDefaultLocaleAsync(restaurantId, cancellationToken);

        public Task UpsertCategoryPrimaryLocaleTranslationAsync(
            Category category,
            string localeCode,
            string name,
            string? description,
            bool isManualEdit,
            CancellationToken cancellationToken) =>
            _inner.UpsertCategoryPrimaryLocaleTranslationAsync(
                category,
                localeCode,
                name,
                description,
                isManualEdit,
                cancellationToken);

        public Task UpsertMenuItemPrimaryLocaleTranslationAsync(
            MenuItem menuItem,
            string localeCode,
            string name,
            string? description,
            bool isManualEdit,
            CancellationToken cancellationToken) =>
            _inner.UpsertMenuItemPrimaryLocaleTranslationAsync(
                menuItem,
                localeCode,
                name,
                description,
                isManualEdit,
                cancellationToken);

        public Task UpsertRestaurantPrimaryLocaleTranslationAsync(
            Restaurant restaurant,
            string localeCode,
            string name,
            string? description,
            string? address,
            bool isManualEdit,
            CancellationToken cancellationToken) =>
            _inner.UpsertRestaurantPrimaryLocaleTranslationAsync(
                restaurant,
                localeCode,
                name,
                description,
                address,
                isManualEdit,
                cancellationToken);
    }

    private async Task SetDefaultLocaleAsync(Guid restaurantId, string localeCode)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var settings = await context.RestaurantSettings.SingleAsync(item => item.RestaurantId == restaurantId);
        settings.DefaultLocale = localeCode;
        await context.SaveChangesAsync();
    }

    private async Task<(int Count, int? MaxPublishedVersion)> GetRestaurantTranslationSnapshotAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var translations = await context.RestaurantTranslations
            .AsNoTracking()
            .Where(item => item.RestaurantId == TestDataSeeder.RestaurantAId)
            .ToListAsync();

        return (
            translations.Count,
            translations.Max(item => item.PublishedSourceVersion));
    }

    private static object CreateCategoryPayload(
        string nameAr,
        string? nameEn,
        string? descriptionAr,
        string? descriptionEn,
        int displayOrder,
        bool isActive = true) =>
        new
        {
            NameAr = nameAr,
            NameEn = nameEn,
            DescriptionAr = descriptionAr,
            DescriptionEn = descriptionEn,
            DisplayOrder = displayOrder,
            IsActive = isActive
        };

    private static object CreateMenuItemPayload(
        string nameAr,
        string? nameEn,
        string? descriptionAr,
        string? descriptionEn,
        decimal price) =>
        new
        {
            CategoryId = TestDataSeeder.CategoryAId,
            ImageFileId = (Guid?)null,
            NameAr = nameAr,
            NameEn = nameEn,
            DescriptionAr = descriptionAr,
            DescriptionEn = descriptionEn,
            Price = price,
            DiscountPrice = (decimal?)null,
            DisplayOrder = 1,
            IsAvailable = true,
            IsActive = true
        };

    private static object CreateRestaurantPayload(
        string nameAr = "مطعم أ",
        string? nameEn = "Restaurant A",
        string? descriptionAr = null,
        string? descriptionEn = null,
        string? addressAr = null,
        string? addressEn = null) =>
        new
        {
            Slug = "restaurant-a",
            NameAr = nameAr,
            NameEn = nameEn,
            DescriptionAr = descriptionAr,
            DescriptionEn = descriptionEn,
            PhoneNumber = "+1111111111",
            WhatsAppNumber = (string?)null,
            AddressAr = addressAr,
            AddressEn = addressEn,
            Latitude = (decimal?)null,
            Longitude = (decimal?)null,
            AccentColor = "#B8663F"
        };

    private static async Task<HttpResponseMessage> UploadPngAsync(HttpClient client, Guid restaurantId)
    {
        using var imageContent = new ByteArrayContent(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        using var formData = new MultipartFormDataContent
        {
            { imageContent, "file", "menu-item.png" }
        };

        return await client.PostAsync(
            $"/api/v1/admin/restaurants/{restaurantId}/media",
            formData);
    }

    private static async Task AuthenticateAsync(HttpClient client, string email, string password)
    {
        var loginResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { Email = email, Password = password });
        loginResponse.EnsureSuccessStatusCode();

        var payload = await loginResponse.Content.ReadFromJsonAsync<LoginResponseModel>(JsonOptions);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", payload!.AccessToken);
    }

    private static HttpClient CreateHttpsClient(WebApplicationFactory<Program> factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

    private HttpClient CreateHttpsClient() => CreateHttpsClient(_factory);

    private sealed class LoginResponseModel
    {
        public string AccessToken { get; init; } = string.Empty;
    }

    private sealed class CategoryResponse
    {
        public Guid Id { get; init; }
        public string NameAr { get; init; } = string.Empty;
        public string? NameEn { get; init; }
    }

    private sealed class MenuItemResponse
    {
        public Guid Id { get; init; }
    }

    private sealed class UploadedMediaResponse
    {
        public Guid Id { get; init; }
    }

    private sealed class RegisterOwnerResponse
    {
        public Guid RestaurantId { get; init; }
    }
}

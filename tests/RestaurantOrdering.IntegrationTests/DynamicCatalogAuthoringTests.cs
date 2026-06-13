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
using RestaurantOrdering.Application.Features.Catalog.Commands.CreateCatalogCategory;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class DynamicCatalogAuthoringTests : IClassFixture<TestWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public DynamicCatalogAuthoringTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CreateCategory_WhenDefaultLocaleIsFrench_PublishesFrenchTranslationOnly()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SetDefaultLocaleAsync(TestDataSeeder.RestaurantAId, "fr");
        await SeedSupportedLocalesAsync(TestDataSeeder.RestaurantAId, "fr");

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/catalog/categories",
            CreateCategoryPayload("Desserts", "Sweet dishes", 1));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<CategoryResponse>(JsonOptions);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var category = await context.Categories.AsNoTracking().SingleAsync(item => item.Id == created!.Id);
        category.ContentVersion.Should().Be(1);
        category.NameAr.Should().BeEmpty();
        category.NameEn.Should().BeNull();

        var translations = await context.CategoryTranslations
            .AsNoTracking()
            .Where(item => item.CategoryId == created.Id)
            .ToListAsync();
        translations.Should().ContainSingle();
        translations[0].LocaleCode.Should().Be("fr");
        translations[0].Name.Should().Be("Desserts");
        translations[0].Description.Should().Be("Sweet dishes");
        translations[0].PublishedSource.Should().Be(TranslationSource.Original);
        translations[0].PublishedSourceVersion.Should().Be(1);
    }

    [Fact]
    public async Task UpdateCategory_WhenDefaultLocaleIsFrench_BumpsVersionAndUpdatesFrenchTranslation()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SetDefaultLocaleAsync(TestDataSeeder.RestaurantAId, "fr");
        await SeedSupportedLocalesAsync(TestDataSeeder.RestaurantAId, "fr");

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/catalog/categories",
            CreateCategoryPayload("Desserts", "Sweet dishes", 1));
        var created = await createResponse.Content.ReadFromJsonAsync<CategoryResponse>(JsonOptions);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/catalog/categories/{created!.Id}",
            CreateCategoryPayload("Desserts gourmands", "Updated sweet dishes", 1));

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var category = await context.Categories.AsNoTracking().SingleAsync(item => item.Id == created.Id);
        category.ContentVersion.Should().Be(2);

        var frTranslation = await context.CategoryTranslations
            .AsNoTracking()
            .SingleAsync(item => item.CategoryId == created.Id && item.LocaleCode == "fr");
        frTranslation.Name.Should().Be("Desserts gourmands");
        frTranslation.Description.Should().Be("Updated sweet dishes");
        frTranslation.PublishedSourceVersion.Should().Be(2);
        frTranslation.PublishedSource.Should().Be(TranslationSource.Manual);
    }

    [Fact]
    public async Task CreateMenuItem_WhenDefaultLocaleIsGerman_PublishesGermanTranslationWithoutFakeLegacyValues()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SetDefaultLocaleAsync(TestDataSeeder.RestaurantAId, "de");
        await SeedSupportedLocalesAsync(TestDataSeeder.RestaurantAId, "de");

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/catalog/menu-items",
            CreateMenuItemPayload("Schokoladenkuchen", "Lecker", 12.5m));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<MenuItemResponse>(JsonOptions);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var menuItem = await context.MenuItems.AsNoTracking().SingleAsync(item => item.Id == created!.Id);
        menuItem.ContentVersion.Should().Be(1);
        menuItem.NameAr.Should().BeEmpty();
        menuItem.NameEn.Should().BeNull();

        var translations = await context.MenuItemTranslations
            .AsNoTracking()
            .Where(item => item.MenuItemId == created.Id)
            .ToListAsync();
        translations.Should().ContainSingle();
        translations[0].LocaleCode.Should().Be("de");
        translations[0].Name.Should().Be("Schokoladenkuchen");
        translations[0].PublishedSource.Should().Be(TranslationSource.Original);
    }

    [Fact]
    public async Task UpdateMenuItem_WhenDefaultLocaleIsGerman_UpdatesGermanTranslationAndVersion()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SetDefaultLocaleAsync(TestDataSeeder.RestaurantAId, "de");
        await SeedSupportedLocalesAsync(TestDataSeeder.RestaurantAId, "de");

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/catalog/menu-items",
            CreateMenuItemPayload("Kuchen", "Alt", 10m));
        var created = await createResponse.Content.ReadFromJsonAsync<MenuItemResponse>(JsonOptions);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/catalog/menu-items/{created!.Id}",
            CreateMenuItemPayload("Neuer Kuchen", "Neu", 10m));

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var menuItem = await context.MenuItems.AsNoTracking().SingleAsync(item => item.Id == created.Id);
        menuItem.ContentVersion.Should().Be(2);

        var deTranslation = await context.MenuItemTranslations
            .AsNoTracking()
            .SingleAsync(item => item.MenuItemId == created.Id && item.LocaleCode == "de");
        deTranslation.Name.Should().Be("Neuer Kuchen");
        deTranslation.Description.Should().Be("Neu");
        deTranslation.PublishedSourceVersion.Should().Be(2);
    }

    [Fact]
    public async Task UpdateMenuItem_PriceOnlyChange_DoesNotBumpContentVersion()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SetDefaultLocaleAsync(TestDataSeeder.RestaurantAId, "de");
        await SeedSupportedLocalesAsync(TestDataSeeder.RestaurantAId, "de");

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/catalog/menu-items",
            CreateMenuItemPayload("Kuchen", "Beschreibung", 10m));
        var created = await createResponse.Content.ReadFromJsonAsync<MenuItemResponse>(JsonOptions);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/catalog/menu-items/{created!.Id}",
            new
            {
                CategoryId = TestDataSeeder.CategoryAId,
                Name = "Kuchen",
                Description = "Beschreibung",
                Price = 15m,
                DiscountPrice = (decimal?)null,
                ImageFileId = (Guid?)null,
                DisplayOrder = 1,
                IsAvailable = true,
                IsActive = true
            });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var menuItem = await context.MenuItems.AsNoTracking().SingleAsync(item => item.Id == created.Id);
        menuItem.ContentVersion.Should().Be(1);
        menuItem.Price.Should().Be(15m);

        var deTranslation = await context.MenuItemTranslations
            .AsNoTracking()
            .SingleAsync(item => item.MenuItemId == created.Id && item.LocaleCode == "de");
        deTranslation.PublishedSourceVersion.Should().Be(1);
    }

    [Fact]
    public async Task UpdateProfileContent_WhenDefaultLocaleIsFrench_UpdatesFrenchRestaurantTranslation()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SetDefaultLocaleAsync(TestDataSeeder.RestaurantAId, "fr");
        await SeedSupportedLocalesAsync(TestDataSeeder.RestaurantAId, "fr");

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/catalog/profile-content",
            new
            {
                Name = "Restaurant Français",
                Description = "Cuisine française",
                Address = "12 Rue de Paris"
            });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var restaurant = await context.Restaurants.AsNoTracking()
            .SingleAsync(item => item.Id == TestDataSeeder.RestaurantAId);
        restaurant.NameAr.Should().Be("مطعم أ");
        restaurant.NameEn.Should().Be("Restaurant A");

        var frTranslation = await context.RestaurantTranslations
            .AsNoTracking()
            .SingleAsync(item => item.RestaurantId == TestDataSeeder.RestaurantAId && item.LocaleCode == "fr");
        frTranslation.Name.Should().Be("Restaurant Français");
        frTranslation.Description.Should().Be("Cuisine française");
        frTranslation.Address.Should().Be("12 Rue de Paris");
        frTranslation.PublishedSource.Should().Be(TranslationSource.Manual);
    }

    [Fact]
    public async Task CreateCategory_WhenDefaultLocaleIsArabic_SyncsLegacyArabicAndTranslation()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/catalog/categories",
            CreateCategoryPayload("حلويات", "أطباق حلوة", 2));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<CategoryResponse>(JsonOptions);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var category = await context.Categories.AsNoTracking().SingleAsync(item => item.Id == created!.Id);
        category.NameAr.Should().Be("حلويات");
        category.DescriptionAr.Should().Be("أطباق حلوة");

        var arTranslation = await context.CategoryTranslations
            .AsNoTracking()
            .SingleAsync(item => item.CategoryId == created.Id && item.LocaleCode == "ar");
        arTranslation.Name.Should().Be("حلويات");
        arTranslation.PublishedSource.Should().Be(TranslationSource.Original);
    }

    [Fact]
    public async Task CreateCategory_WhenDefaultLocaleIsEnglish_SyncsLegacyEnglishAndTranslation()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SetDefaultLocaleAsync(TestDataSeeder.RestaurantAId, "en");

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/catalog/categories",
            CreateCategoryPayload("Desserts", "Sweet dishes", 3));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<CategoryResponse>(JsonOptions);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var category = await context.Categories.AsNoTracking().SingleAsync(item => item.Id == created!.Id);
        category.NameEn.Should().Be("Desserts");
        category.DescriptionEn.Should().Be("Sweet dishes");

        var enTranslation = await context.CategoryTranslations
            .AsNoTracking()
            .SingleAsync(item => item.CategoryId == created.Id && item.LocaleCode == "en");
        enTranslation.Name.Should().Be("Desserts");
        enTranslation.PublishedSource.Should().Be(TranslationSource.Original);
    }

    [Fact]
    public async Task UpdateCategory_WithExistingDraft_DoesNotPublishOrDeleteDraft()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/catalog/categories",
            CreateCategoryPayload("فئة", "وصف", 4));
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
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/catalog/categories/{created!.Id}",
            CreateCategoryPayload("فئة محدثة", "وصف", 4));
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
    public async Task PutRestaurantLocales_ChangeDefaultToFrench_SucceedsAfterDynamicAuthoringEnabled()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SeedSupportedLocalesAsync(TestDataSeeder.RestaurantAId, "ar", "en", "fr");
        await SeedPublishedTranslationsAsync(TestDataSeeder.RestaurantAId, "ar");
        await SeedPublishedTranslationsAsync(TestDataSeeder.RestaurantAId, "fr");

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/locales",
            CreateLocaleUpdatePayload(
                defaultLocale: "fr",
                supportedLocales:
                [
                    new SupportedLocalePayload("ar", true, 1),
                    new SupportedLocalePayload("en", true, 2),
                    new SupportedLocalePayload("fr", true, 3)
                ],
                translationMode: "ManualOnly"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var settings = await response.Content.ReadFromJsonAsync<LocaleSettingsResponse>(JsonOptions);
        settings!.DefaultLocale.Should().Be("fr");
    }

    [Fact]
    public async Task PutRestaurantLocales_ChangeDefaultToFrench_FailsWhenPrimaryTranslationsMissing()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SeedSupportedLocalesAsync(TestDataSeeder.RestaurantAId, "ar", "fr");
        await SeedPublishedTranslationsAsync(TestDataSeeder.RestaurantAId, "ar");

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/locales",
            CreateLocaleUpdatePayload(
                defaultLocale: "fr",
                supportedLocales:
                [
                    new SupportedLocalePayload("ar", true, 1),
                    new SupportedLocalePayload("fr", true, 2)
                ],
                translationMode: "ManualOnly"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("missingRestaurantTranslations");
        body.Should().Contain("missingCategoryTranslations");
        body.Should().Contain("missingMenuItemTranslations");
    }

    [Fact]
    public async Task CreateCategory_WhenPrimaryTranslationUpsertFails_DoesNotPersistCategory()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SetDefaultLocaleAsync(TestDataSeeder.RestaurantAId, "fr");
        await SeedSupportedLocalesAsync(TestDataSeeder.RestaurantAId, "fr");

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var dateTimeService = scope.ServiceProvider.GetRequiredService<IDateTimeService>();
        var innerWriter = scope.ServiceProvider.GetRequiredService<IPublishedTranslationWriter>();
        var failingWriter = new FailingPrimaryLocaleTranslationWriter(innerWriter);
        var handler = new CreateCatalogCategoryCommandHandler(context, dateTimeService, failingWriter);

        var countBefore = await context.Categories.CountAsync(item => item.RestaurantId == TestDataSeeder.RestaurantAId);

        var act = async () => await handler.Handle(
            new CreateCatalogCategoryCommand(
                TestDataSeeder.RestaurantAId,
                "Desserts",
                "Sweet",
                1,
                true),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Simulated primary locale translation failure*");

        (await context.Categories.CountAsync(item => item.RestaurantId == TestDataSeeder.RestaurantAId))
            .Should().Be(countBefore);
    }

    [Fact]
    public async Task LegacyCreateCategory_EndpointStillWorks()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/categories",
            new
            {
                NameAr = "فئة قديمة",
                NameEn = "Legacy Category",
                DescriptionAr = (string?)null,
                DescriptionEn = (string?)null,
                DisplayOrder = 9,
                IsActive = true
            });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task DynamicCatalogWrite_DoesNotCreateTranslationJobs()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);
        await SetDefaultLocaleAsync(TestDataSeeder.RestaurantAId, "fr");
        await SeedSupportedLocalesAsync(TestDataSeeder.RestaurantAId, "fr");

        var jobsBefore = await CountTranslationJobsAsync();

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/catalog/categories",
            CreateCategoryPayload("Desserts", null, 1));

        (await CountTranslationJobsAsync()).Should().Be(jobsBefore);
    }

    private sealed class FailingPrimaryLocaleTranslationWriter : IPublishedTranslationWriter
    {
        private readonly IPublishedTranslationWriter _inner;

        public FailingPrimaryLocaleTranslationWriter(IPublishedTranslationWriter inner)
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
            _inner.UpsertCategoryPublishedTranslationsAsync(category, isManualEdit, cancellationToken);

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
            throw new InvalidOperationException("Simulated primary locale translation failure.");

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

    private async Task SeedSupportedLocalesAsync(Guid restaurantId, params string[] codes)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var sortOrder = 1;
        foreach (var code in codes)
        {
            var exists = await context.RestaurantSupportedLocales.AnyAsync(
                item => item.RestaurantId == restaurantId && item.LocaleCode == code);
            if (!exists)
            {
                context.RestaurantSupportedLocales.Add(new RestaurantSupportedLocale
                {
                    RestaurantId = restaurantId,
                    LocaleCode = code,
                    IsEnabled = true,
                    SortOrder = sortOrder++,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await context.SaveChangesAsync();
    }

    private async Task SeedPublishedTranslationsAsync(Guid restaurantId, string localeCode)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var now = DateTime.UtcNow;

        if (!await context.RestaurantTranslations.AnyAsync(
                item => item.RestaurantId == restaurantId && item.LocaleCode == localeCode))
        {
            context.RestaurantTranslations.Add(new RestaurantTranslation
            {
                RestaurantId = restaurantId,
                LocaleCode = localeCode,
                Name = localeCode == "ar" ? "مطعم أ" : localeCode == "fr" ? "Restaurant FR" : "Restaurant",
                PublishedSource = TranslationSource.Original,
                PublishedSourceVersion = 1,
                CreatedAt = now
            });
        }

        var categories = await context.Categories
            .Where(item => item.RestaurantId == restaurantId && !item.IsDeleted)
            .ToListAsync();

        foreach (var category in categories)
        {
            if (await context.CategoryTranslations.AnyAsync(
                    item => item.CategoryId == category.Id && item.LocaleCode == localeCode))
            {
                continue;
            }

            context.CategoryTranslations.Add(new CategoryTranslation
            {
                CategoryId = category.Id,
                LocaleCode = localeCode,
                Name = localeCode == "ar" ? category.NameAr : category.NameEn ?? "Category",
                PublishedSource = TranslationSource.Original,
                PublishedSourceVersion = category.ContentVersion,
                CreatedAt = now
            });
        }

        var menuItems = await context.MenuItems
            .Where(item => item.RestaurantId == restaurantId && !item.IsDeleted)
            .ToListAsync();

        foreach (var menuItem in menuItems)
        {
            if (await context.MenuItemTranslations.AnyAsync(
                    item => item.MenuItemId == menuItem.Id && item.LocaleCode == localeCode))
            {
                continue;
            }

            context.MenuItemTranslations.Add(new MenuItemTranslation
            {
                MenuItemId = menuItem.Id,
                LocaleCode = localeCode,
                Name = localeCode == "ar" ? menuItem.NameAr : menuItem.NameEn ?? "Item",
                PublishedSource = TranslationSource.Original,
                PublishedSourceVersion = menuItem.ContentVersion,
                CreatedAt = now
            });
        }

        await context.SaveChangesAsync();
    }

    private async Task<int> CountTranslationJobsAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await context.TranslationJobs.CountAsync();
    }

    private static object CreateCategoryPayload(string name, string? description, int displayOrder) =>
        new
        {
            Name = name,
            Description = description,
            DisplayOrder = displayOrder,
            IsActive = true
        };

    private static object CreateMenuItemPayload(string name, string? description, decimal price) =>
        new
        {
            CategoryId = TestDataSeeder.CategoryAId,
            Name = name,
            Description = description,
            Price = price,
            DiscountPrice = (decimal?)null,
            ImageFileId = (Guid?)null,
            DisplayOrder = 1,
            IsAvailable = true,
            IsActive = true
        };

    private static object CreateLocaleUpdatePayload(
        string defaultLocale,
        IReadOnlyList<SupportedLocalePayload> supportedLocales,
        string translationMode) =>
        new
        {
            DefaultLocale = defaultLocale,
            SupportedLocales = supportedLocales.Select(item => new
            {
                Code = item.Code,
                IsEnabled = item.IsEnabled,
                SortOrder = item.SortOrder
            }),
            TranslationMode = translationMode
        };

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

    private sealed record SupportedLocalePayload(string Code, bool IsEnabled, int SortOrder);

    private sealed class LoginResponseModel
    {
        public string AccessToken { get; init; } = string.Empty;
    }

    private sealed class CategoryResponse
    {
        public Guid Id { get; init; }
    }

    private sealed class MenuItemResponse
    {
        public Guid Id { get; init; }
    }

    private sealed class LocaleSettingsResponse
    {
        public string DefaultLocale { get; init; } = string.Empty;
    }
}

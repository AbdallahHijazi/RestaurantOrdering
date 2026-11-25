using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;
using RestaurantOrdering.Infrastructure.Persistence;
using RestaurantOrdering.IntegrationTests.Infrastructure;
using Xunit;

namespace RestaurantOrdering.IntegrationTests;

public sealed class TranslationReviewApiTests : IClassFixture<TestWebApplicationFactory>
{
    private static readonly Guid CategoryDraftEnId = Guid.Parse("aaaaaaaa-dddd-dddd-dddd-dddddddddd01");
    private static readonly Guid CategoryDraftFrId = Guid.Parse("aaaaaaaa-dddd-dddd-dddd-dddddddddd02");
    private static readonly Guid CategoryDraftStaleId = Guid.Parse("aaaaaaaa-dddd-dddd-dddd-dddddddddd03");
    private static readonly Guid CategoryDraftEmptyNameId = Guid.Parse("aaaaaaaa-dddd-dddd-dddd-dddddddddd04");
    private static readonly Guid CategoryDraftFailedId = Guid.Parse("aaaaaaaa-dddd-dddd-dddd-dddddddddd05");
    private static readonly Guid CategoryDraftBulkAId = Guid.Parse("aaaaaaaa-dddd-dddd-dddd-dddddddddd06");
    private static readonly Guid CategoryDraftBulkBId = Guid.Parse("aaaaaaaa-dddd-dddd-dddd-dddddddddd07");
    private static readonly Guid CategoryDraftBulkInvalidId = Guid.Parse("aaaaaaaa-dddd-dddd-dddd-dddddddddd08");
    private static readonly Guid CategoryDraftRestaurantBId = Guid.Parse("bbbbbbbb-dddd-dddd-dddd-dddddddddd01");

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly TestWebApplicationFactory _factory;

    public TranslationReviewApiTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Owner_CanViewReviewQueue()
    {
        await SeedReviewScenarioAsync();
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var page = await response.Content.ReadFromJsonAsync<PagedTranslationReviewResponse>(JsonOptions);
        page!.Items.Should().NotBeEmpty();
        page.Items.Should().Contain(item => item.TranslationId == CategoryDraftEnId);
    }

    [Fact]
    public async Task Manager_WithoutViewPermission_ReturnsForbidden()
    {
        await SeedReviewScenarioAsync();
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Manager_WithViewPermission_CanReadReviewQueue()
    {
        await SeedReviewScenarioAsync();
        await AddGrantAsync(
            TestDataSeeder.ManagerAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.TranslationsView);

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var page = await response.Content.ReadFromJsonAsync<PagedTranslationReviewResponse>(JsonOptions);
        page!.Items.Should().NotBeEmpty();
    }

    [Fact]
    public async Task KitchenManager_WithViewPermission_CanReadOnly()
    {
        await SeedReviewScenarioAsync();
        await AddGrantAsync(
            TestDataSeeder.KitchenAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.TranslationsView);

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.KitchenAEmail, TestDataSeeder.CorrectPassword);

        var listResponse = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations");
        listResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var editResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftEnId}",
            new { Name = "Edited", Description = (string?)null, Address = (string?)null });
        editResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var approveResponse = await client.PostAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftEnId}/approve",
            null);
        approveResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var retryResponse = await client.PostAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftFailedId}/retry",
            null);
        retryResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task EditDraft_RequiresEditPermission()
    {
        await SeedReviewScenarioAsync();
        await AddGrantAsync(
            TestDataSeeder.ManagerAUserId,
            TestDataSeeder.RestaurantAId,
            RestaurantPermission.TranslationsView);

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.ManagerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftEnId}",
            new { Name = "Edited EN", Description = "Edited desc", Address = (string?)null });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task EditDraft_SetsDraftSourceToManual()
    {
        await SeedReviewScenarioAsync();
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftEnId}",
            new { Name = "Edited EN", Description = "Edited desc", Address = (string?)null });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<TranslationReviewResponse>(JsonOptions);
        body!.DraftSource.Should().Be("Manual");
        body.DraftStatus.Should().Be("NeedsReview");
    }

    [Fact]
    public async Task EditDraft_StaleDraft_ReturnsBadRequest()
    {
        await SeedReviewScenarioAsync();
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftStaleId}",
            new { Name = "Should Fail", Description = (string?)null, Address = (string?)null });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ApproveDraft_MovesDraftToPublished()
    {
        await SeedReviewScenarioAsync();
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftFrId}/approve",
            null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<TranslationReviewResponse>(JsonOptions);
        body!.PublishedName.Should().Be("[fr] Draft FR");
        body.PublishedDescription.Should().Be("[fr] Desc FR");
        body.DraftStatus.Should().BeNull();
    }

    [Fact]
    public async Task ApproveDraft_ClearsDraftFields()
    {
        await SeedReviewScenarioAsync();
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        await client.PostAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftFrId}/approve",
            null);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var translation = await context.CategoryTranslations
            .AsNoTracking()
            .SingleAsync(item => item.Id == CategoryDraftFrId);

        translation.DraftName.Should().BeNull();
        translation.DraftDescription.Should().BeNull();
        translation.DraftStatus.Should().BeNull();
        translation.DraftSource.Should().BeNull();
        translation.DraftSourceVersion.Should().BeNull();
        translation.ApprovedAt.Should().NotBeNull();
        translation.ApprovedByUserId.Should().Be(TestDataSeeder.OwnerAUserId);
    }

    [Fact]
    public async Task ApproveDraft_StaleDraft_ReturnsBadRequest()
    {
        await SeedReviewScenarioAsync();
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftStaleId}/approve",
            null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ApproveDraft_EmptyDraftName_ReturnsBadRequest()
    {
        await SeedReviewScenarioAsync();
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftEmptyNameId}/approve",
            null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task BulkApprove_ApprovesMultipleDrafts()
    {
        await SeedReviewScenarioAsync();
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/bulk-approve",
            new { TranslationIds = new[] { CategoryDraftBulkAId, CategoryDraftBulkBId } });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var approved = await response.Content.ReadFromJsonAsync<List<TranslationReviewResponse>>(JsonOptions);
        approved.Should().HaveCount(2);
        approved!.Should().OnlyContain(item =>
            item.DraftStatus == null && item.PublishedName != null);
    }

    [Fact]
    public async Task BulkApprove_InvalidItem_RollsBackEntireOperation()
    {
        await SeedReviewScenarioAsync();
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/bulk-approve",
            new
            {
                TranslationIds = new[]
                {
                    CategoryDraftBulkAId,
                    CategoryDraftBulkBId,
                    CategoryDraftBulkInvalidId
                }
            });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var translations = await context.CategoryTranslations
            .AsNoTracking()
            .Where(item => item.Id == CategoryDraftBulkAId || item.Id == CategoryDraftBulkBId)
            .ToListAsync();

        translations.Should().OnlyContain(item => item.DraftStatus == TranslationStatus.NeedsReview);
        translations.Should().OnlyContain(item => item.Name == null);
    }

    [Fact]
    public async Task BulkApprove_MoreThan100Ids_ReturnsBadRequest()
    {
        await SeedReviewScenarioAsync();
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var ids = Enumerable.Range(0, 101).Select(_ => Guid.NewGuid()).ToArray();
        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/bulk-approve",
            new { TranslationIds = ids });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task BulkApprove_DuplicateIds_ReturnsBadRequest()
    {
        await SeedReviewScenarioAsync();
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/bulk-approve",
            new { TranslationIds = new[] { CategoryDraftBulkAId, CategoryDraftBulkAId } });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Retry_ResetsFailedJobToQueued()
    {
        await SeedReviewScenarioAsync();
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftFailedId}/retry",
            null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var job = await context.TranslationJobs
            .AsNoTracking()
            .SingleAsync(item =>
                item.EntityId == TestDataSeeder.CategoryAId
                && item.TargetLocaleCode == "de");

        job.Status.Should().Be(TranslationJobStatus.Queued);
        job.AttemptCount.Should().Be(0);
        job.NextAttemptAt.Should().BeNull();
        job.LastError.Should().BeNull();
    }

    [Fact]
    public async Task Retry_DoesNotCreateDuplicateJob()
    {
        await SeedReviewScenarioAsync();
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        await client.PostAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftFailedId}/retry",
            null);
        await client.PostAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftFailedId}/retry",
            null);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var jobCount = await context.TranslationJobs.CountAsync(item =>
            item.EntityId == TestDataSeeder.CategoryAId && item.TargetLocaleCode == "de");
        jobCount.Should().Be(1);
    }

    [Fact]
    public async Task Retry_DoesNotInvokeTranslationProvider()
    {
        await SeedReviewScenarioAsync();
        ResetFakeProviderCallCount();

        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.PostAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftFailedId}/retry",
            null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        GetFakeProviderCallCount().Should().Be(0);
    }

    [Fact]
    public async Task CrossRestaurantAccess_IsForbiddenOrNotFound()
    {
        await SeedReviewScenarioAsync();
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftRestaurantBId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ReviewOperations_CreateAuditLogs()
    {
        await SeedReviewScenarioAsync();
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        await client.PutAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftEnId}",
            new { Name = "Audit Edit", Description = (string?)null, Address = (string?)null });
        await client.PostAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftFrId}/approve",
            null);
        await client.PostAsJsonAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/bulk-approve",
            new { TranslationIds = new[] { CategoryDraftBulkAId } });
        await client.PostAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftFailedId}/retry",
            null);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var events = await context.TranslationAuditLogs
            .AsNoTracking()
            .Where(item => item.RestaurantId == TestDataSeeder.RestaurantAId)
            .Select(item => item.EventType)
            .ToListAsync();

        events.Should().Contain(TranslationAuditEventType.TranslationManuallyEdited);
        events.Should().Contain(TranslationAuditEventType.TranslationApproved);
        events.Should().Contain(TranslationAuditEventType.BulkTranslationsApproved);
        events.Should().Contain(TranslationAuditEventType.TranslationRetried);
    }

    [Fact]
    public async Task StaleDraft_AppearsWithIsStaleAndCannotApprove()
    {
        await SeedReviewScenarioAsync();
        using var client = CreateHttpsClient();
        await AuthenticateAsync(client, TestDataSeeder.OwnerAEmail, TestDataSeeder.CorrectPassword);

        var response = await client.GetAsync(
            $"/api/v1/admin/restaurants/{TestDataSeeder.RestaurantAId}/translations/{CategoryDraftStaleId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<TranslationReviewResponse>(JsonOptions);
        body!.IsStale.Should().BeTrue();
        body.CanApprove.Should().BeFalse();
        body.DraftSourceVersion.Should().Be(1);
        body.CurrentContentVersion.Should().Be(2);
    }

    [Fact]
    public void NoFrontendChangesWereMadeForTranslationReviewApi()
    {
        var frontendProject = Path.Combine(
            AppContext.BaseDirectory,
            "..", "..", "..", "..", "..", "src", "RestaurantOrdering.Web");

        Directory.Exists(frontendProject).Should().BeFalse(
            "this solution does not include a frontend project targeted by 7A.9");
    }

    private async Task SeedReviewScenarioAsync()
    {
        await TestDataSeeder.SeedAsync(_factory.Services);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var now = DateTime.UtcNow;

        var category = await context.Categories.SingleAsync(item => item.Id == TestDataSeeder.CategoryAId);
        category.ContentVersion = 2;

        context.CategoryTranslations.AddRange(
            CreateCategoryDraft(
                CategoryDraftEnId,
                TestDataSeeder.CategoryAId,
                "en",
                "[en] Draft EN",
                "[en] Desc EN",
                TranslationStatus.NeedsReview,
                TranslationSource.Machine,
                draftSourceVersion: 2,
                now),
            CreateCategoryDraft(
                CategoryDraftFrId,
                TestDataSeeder.CategoryAId,
                "fr",
                "[fr] Draft FR",
                "[fr] Desc FR",
                TranslationStatus.NeedsReview,
                TranslationSource.Machine,
                draftSourceVersion: 2,
                now),
            CreateCategoryDraft(
                CategoryDraftStaleId,
                TestDataSeeder.CategoryAId,
                "es",
                "[es] Stale Draft",
                null,
                TranslationStatus.NeedsReview,
                TranslationSource.Machine,
                draftSourceVersion: 1,
                now),
            CreateCategoryDraft(
                CategoryDraftEmptyNameId,
                TestDataSeeder.CategoryAId,
                "it",
                "   ",
                null,
                TranslationStatus.NeedsReview,
                TranslationSource.Machine,
                draftSourceVersion: 2,
                now),
            CreateCategoryDraft(
                CategoryDraftFailedId,
                TestDataSeeder.CategoryAId,
                "de",
                "[de] Failed Draft",
                null,
                TranslationStatus.Failed,
                TranslationSource.Machine,
                draftSourceVersion: 2,
                now),
            CreateCategoryDraft(
                CategoryDraftBulkAId,
                TestDataSeeder.CategoryAId,
                "tr",
                "[tr] Bulk A",
                null,
                TranslationStatus.NeedsReview,
                TranslationSource.Machine,
                draftSourceVersion: 2,
                now),
            CreateCategoryDraft(
                CategoryDraftBulkBId,
                TestDataSeeder.CategoryAId,
                "fa",
                "[fa] Bulk B",
                null,
                TranslationStatus.NeedsReview,
                TranslationSource.Machine,
                draftSourceVersion: 2,
                now),
            CreateCategoryDraft(
                CategoryDraftBulkInvalidId,
                TestDataSeeder.CategoryAId,
                "he",
                "   ",
                null,
                TranslationStatus.NeedsReview,
                TranslationSource.Machine,
                draftSourceVersion: 2,
                now),
            CreateCategoryDraft(
                CategoryDraftRestaurantBId,
                TestDataSeeder.CategoryBId,
                "en",
                "[en] Restaurant B",
                null,
                TranslationStatus.NeedsReview,
                TranslationSource.Machine,
                draftSourceVersion: 1,
                now));

        context.TranslationJobs.Add(new TranslationJob
        {
            RestaurantId = TestDataSeeder.RestaurantAId,
            EntityType = TranslatableEntityType.Category,
            EntityId = TestDataSeeder.CategoryAId,
            TargetLocaleCode = "de",
            SourceLocaleCode = "ar",
            SourceVersion = 2,
            Status = TranslationJobStatus.Failed,
            AttemptCount = 3,
            LastError = "Provider failed",
            IdempotencyKey = $"{TranslatableEntityType.Category}:{TestDataSeeder.CategoryAId:N}:de:2",
            CreatedAt = now
        });

        await context.SaveChangesAsync();
    }

    private static CategoryTranslation CreateCategoryDraft(
        Guid id,
        Guid categoryId,
        string localeCode,
        string draftName,
        string? draftDescription,
        TranslationStatus draftStatus,
        TranslationSource draftSource,
        int draftSourceVersion,
        DateTime now) =>
        new()
        {
            Id = id,
            CategoryId = categoryId,
            LocaleCode = localeCode,
            DraftName = draftName,
            DraftDescription = draftDescription,
            DraftStatus = draftStatus,
            DraftSource = draftSource,
            DraftSourceVersion = draftSourceVersion,
            DraftGeneratedAt = now,
            CreatedAt = now
        };

    private async Task AddGrantAsync(Guid userId, Guid restaurantId, RestaurantPermission permission)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        context.RestaurantUserPermissionGrants.Add(new RestaurantUserPermissionGrant
        {
            RestaurantId = restaurantId,
            UserId = userId,
            Permission = permission,
            CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();
    }

    private void ResetFakeProviderCallCount()
    {
        var provider = _factory.Services.GetRequiredService<ITranslationProvider>();
        if (provider is FakeTranslationProvider fakeProvider)
        {
            fakeProvider.Reset();
        }
    }

    private int GetFakeProviderCallCount()
    {
        var provider = _factory.Services.GetRequiredService<ITranslationProvider>();
        return provider is FakeTranslationProvider fakeProvider ? fakeProvider.TranslateCallCount : 0;
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

    private sealed class PagedTranslationReviewResponse
    {
        public List<TranslationReviewResponse> Items { get; init; } = [];
        public int Page { get; init; }
        public int PageSize { get; init; }
        public int TotalCount { get; init; }
    }

    private sealed class TranslationReviewResponse
    {
        public Guid TranslationId { get; init; }
        public string EntityType { get; init; } = string.Empty;
        public Guid EntityId { get; init; }
        public string EntityDisplayName { get; init; } = string.Empty;
        public string Locale { get; init; } = string.Empty;
        public string? DraftStatus { get; init; }
        public string? DraftSource { get; init; }
        public string? DraftName { get; init; }
        public string? DraftDescription { get; init; }
        public string? DraftAddress { get; init; }
        public string? PublishedName { get; init; }
        public string? PublishedDescription { get; init; }
        public string? PublishedAddress { get; init; }
        public int? DraftSourceVersion { get; init; }
        public int CurrentContentVersion { get; init; }
        public bool IsStale { get; init; }
        public bool CanApprove { get; init; }
        public bool CanRetry { get; init; }
        public DateTime? UpdatedAt { get; init; }
    }
}

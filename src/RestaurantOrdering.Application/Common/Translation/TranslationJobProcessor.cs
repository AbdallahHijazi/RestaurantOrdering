using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Translation;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Common.Translation;

public sealed class TranslationJobProcessor : ITranslationJobProcessor
{
    private static readonly TimeSpan RetryDelay = TimeSpan.FromMinutes(1);

    private readonly IApplicationDbContext _context;
    private readonly ITranslationProvider _translationProvider;
    private readonly IDateTimeService _dateTimeService;

    public TranslationJobProcessor(
        IApplicationDbContext context,
        ITranslationProvider translationProvider,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _translationProvider = translationProvider;
        _dateTimeService = dateTimeService;
    }

    public async Task<TranslationJobProcessResult?> ProcessNextQueuedJobAsync(
        CancellationToken cancellationToken)
    {
        var now = _dateTimeService.UtcNow;

        var jobId = await _context.TranslationJobs
            .Where(item =>
                item.Status == TranslationJobStatus.Queued
                && (item.NextAttemptAt == null || item.NextAttemptAt <= now))
            .OrderBy(item => item.CreatedAt)
            .Select(item => item.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (jobId == Guid.Empty)
        {
            return null;
        }

        return await ProcessJobAsync(jobId, cancellationToken);
    }

    public async Task<TranslationJobProcessResult> ProcessJobAsync(
        Guid jobId,
        CancellationToken cancellationToken)
    {
        var job = await _context.TranslationJobs
            .SingleOrDefaultAsync(item => item.Id == jobId, cancellationToken)
            ?? throw new InvalidOperationException($"Translation job '{jobId}' was not found.");

        if (job.Status != TranslationJobStatus.Queued)
        {
            return new TranslationJobProcessResult(job.Id, "NotQueued");
        }

        return await ProcessCoreAsync(job, workerId: null, cancellationToken);
    }

    public async Task<TranslationJobProcessResult> ProcessClaimedJobAsync(
        Guid jobId,
        string workerId,
        CancellationToken cancellationToken)
    {
        var job = await _context.TranslationJobs
            .SingleOrDefaultAsync(item => item.Id == jobId, cancellationToken)
            ?? throw new InvalidOperationException($"Translation job '{jobId}' was not found.");

        var now = _dateTimeService.UtcNow;
        if (!TranslationJobLease.IsActiveClaim(job, workerId, now))
        {
            return new TranslationJobProcessResult(job.Id, "StaleClaim");
        }

        return await ProcessCoreAsync(job, workerId, cancellationToken);
    }

    private async Task<TranslationJobProcessResult> ProcessCoreAsync(
        TranslationJob job,
        string? workerId,
        CancellationToken cancellationToken)
    {
        var now = _dateTimeService.UtcNow;
        var currentContentVersion = await GetCurrentContentVersionAsync(job, cancellationToken);

        if (currentContentVersion is null)
        {
            MarkSkipped(job, now);
            await _context.SaveChangesAsync(cancellationToken);
            return new TranslationJobProcessResult(job.Id, "Skipped", "Entity was not found.");
        }

        if (job.SourceVersion != currentContentVersion.Value)
        {
            MarkSkipped(job, now);
            await _context.SaveChangesAsync(cancellationToken);
            return new TranslationJobProcessResult(job.Id, "Skipped", "Source version is stale.");
        }

        var sourceFields = await LoadSourceFieldsAsync(job, cancellationToken);
        if (string.IsNullOrWhiteSpace(sourceFields.Name))
        {
            MarkSkipped(job, now);
            await _context.SaveChangesAsync(cancellationToken);
            return new TranslationJobProcessResult(job.Id, "Skipped", "Source content is empty.");
        }

        var providerResult = await _translationProvider.TranslateAsync(
            new TranslationProviderRequest(
                job.SourceLocaleCode,
                job.TargetLocaleCode,
                sourceFields,
                job.IdempotencyKey),
            cancellationToken);

        if (workerId is not null
            && !await HasActiveClaimAsync(job.Id, workerId, cancellationToken))
        {
            return new TranslationJobProcessResult(job.Id, "StaleClaim");
        }

        if (providerResult.IsSuccess && providerResult.TranslatedFields is not null)
        {
            await ApplyDraftTranslationAsync(job, providerResult.TranslatedFields, now, cancellationToken);
            job.Status = TranslationJobStatus.Succeeded;
            job.CompletedAt = now;
            job.LastError = null;
            TranslationJobLease.Clear(job);
            await _context.SaveChangesAsync(cancellationToken);
            return new TranslationJobProcessResult(job.Id, "Succeeded");
        }

        job.AttemptCount++;
        job.LastError = providerResult.ErrorMessage
            ?? providerResult.ErrorCode
            ?? "Translation provider failed.";

        if (job.AttemptCount >= job.MaxAttempts)
        {
            job.Status = TranslationJobStatus.Failed;
            job.CompletedAt = now;
            job.NextAttemptAt = null;
        }
        else
        {
            job.Status = TranslationJobStatus.Queued;
            job.NextAttemptAt = now.Add(RetryDelay);
        }

        TranslationJobLease.Clear(job);
        await _context.SaveChangesAsync(cancellationToken);
        return new TranslationJobProcessResult(job.Id, "Failed", job.LastError);
    }

    private async Task<bool> HasActiveClaimAsync(
        Guid jobId,
        string workerId,
        CancellationToken cancellationToken)
    {
        var job = await _context.TranslationJobs
            .AsNoTracking()
            .SingleAsync(item => item.Id == jobId, cancellationToken);

        return TranslationJobLease.IsActiveClaim(job, workerId, _dateTimeService.UtcNow);
    }

    private async Task<int?> GetCurrentContentVersionAsync(
        TranslationJob job,
        CancellationToken cancellationToken) =>
        job.EntityType switch
        {
            TranslatableEntityType.Restaurant => await _context.Restaurants
                .Where(item => item.Id == job.EntityId && !item.IsDeleted)
                .Select(item => (int?)item.ContentVersion)
                .SingleOrDefaultAsync(cancellationToken),
            TranslatableEntityType.Category => await _context.Categories
                .Where(item => item.Id == job.EntityId && !item.IsDeleted)
                .Select(item => (int?)item.ContentVersion)
                .SingleOrDefaultAsync(cancellationToken),
            TranslatableEntityType.MenuItem => await _context.MenuItems
                .Where(item => item.Id == job.EntityId && !item.IsDeleted)
                .Select(item => (int?)item.ContentVersion)
                .SingleOrDefaultAsync(cancellationToken),
            _ => null
        };

    private async Task<TranslationFields> LoadSourceFieldsAsync(
        TranslationJob job,
        CancellationToken cancellationToken)
    {
        switch (job.EntityType)
        {
            case TranslatableEntityType.Restaurant:
            {
                var restaurant = await _context.Restaurants
                    .SingleAsync(item => item.Id == job.EntityId, cancellationToken);
                return await TranslationSourceContentLoader.LoadRestaurantAsync(
                    _context,
                    restaurant,
                    job.SourceLocaleCode,
                    cancellationToken);
            }
            case TranslatableEntityType.Category:
            {
                var category = await _context.Categories
                    .SingleAsync(item => item.Id == job.EntityId, cancellationToken);
                return await TranslationSourceContentLoader.LoadCategoryAsync(
                    _context,
                    category,
                    job.SourceLocaleCode,
                    cancellationToken);
            }
            case TranslatableEntityType.MenuItem:
            {
                var menuItem = await _context.MenuItems
                    .SingleAsync(item => item.Id == job.EntityId, cancellationToken);
                return await TranslationSourceContentLoader.LoadMenuItemAsync(
                    _context,
                    menuItem,
                    job.SourceLocaleCode,
                    cancellationToken);
            }
            default:
                return new TranslationFields(string.Empty);
        }
    }

    private async Task ApplyDraftTranslationAsync(
        TranslationJob job,
        TranslationFields translatedFields,
        DateTime now,
        CancellationToken cancellationToken)
    {
        switch (job.EntityType)
        {
            case TranslatableEntityType.Restaurant:
                await ApplyRestaurantDraftAsync(job, translatedFields, now, cancellationToken);
                break;
            case TranslatableEntityType.Category:
                await ApplyCategoryDraftAsync(job, translatedFields, now, cancellationToken);
                break;
            case TranslatableEntityType.MenuItem:
                await ApplyMenuItemDraftAsync(job, translatedFields, now, cancellationToken);
                break;
        }
    }

    private async Task ApplyRestaurantDraftAsync(
        TranslationJob job,
        TranslationFields translatedFields,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var translation = await _context.RestaurantTranslations
            .FirstOrDefaultAsync(
                item => item.RestaurantId == job.EntityId && item.LocaleCode == job.TargetLocaleCode,
                cancellationToken);

        if (translation is null)
        {
            translation = new RestaurantTranslation
            {
                RestaurantId = job.EntityId,
                LocaleCode = job.TargetLocaleCode,
                CreatedAt = now
            };
            _context.RestaurantTranslations.Add(translation);
        }

        if (!ShouldUpdateDraft(translation.DraftSourceVersion, job.SourceVersion))
        {
            return;
        }

        translation.DraftName = translatedFields.Name.Trim();
        translation.DraftDescription = NormalizeOptional(translatedFields.Description);
        translation.DraftAddress = NormalizeOptional(translatedFields.Address);
        translation.DraftSource = TranslationSource.Machine;
        translation.DraftSourceVersion = job.SourceVersion;
        translation.DraftStatus = TranslationStatus.NeedsReview;
        translation.DraftGeneratedAt = now;
        translation.DraftLastError = null;
    }

    private async Task ApplyCategoryDraftAsync(
        TranslationJob job,
        TranslationFields translatedFields,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var translation = await _context.CategoryTranslations
            .FirstOrDefaultAsync(
                item => item.CategoryId == job.EntityId && item.LocaleCode == job.TargetLocaleCode,
                cancellationToken);

        if (translation is null)
        {
            translation = new CategoryTranslation
            {
                CategoryId = job.EntityId,
                LocaleCode = job.TargetLocaleCode,
                CreatedAt = now
            };
            _context.CategoryTranslations.Add(translation);
        }

        if (!ShouldUpdateDraft(translation.DraftSourceVersion, job.SourceVersion))
        {
            return;
        }

        translation.DraftName = translatedFields.Name.Trim();
        translation.DraftDescription = NormalizeOptional(translatedFields.Description);
        translation.DraftSource = TranslationSource.Machine;
        translation.DraftSourceVersion = job.SourceVersion;
        translation.DraftStatus = TranslationStatus.NeedsReview;
        translation.DraftGeneratedAt = now;
        translation.DraftLastError = null;
    }

    private async Task ApplyMenuItemDraftAsync(
        TranslationJob job,
        TranslationFields translatedFields,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var translation = await _context.MenuItemTranslations
            .FirstOrDefaultAsync(
                item => item.MenuItemId == job.EntityId && item.LocaleCode == job.TargetLocaleCode,
                cancellationToken);

        if (translation is null)
        {
            translation = new MenuItemTranslation
            {
                MenuItemId = job.EntityId,
                LocaleCode = job.TargetLocaleCode,
                CreatedAt = now
            };
            _context.MenuItemTranslations.Add(translation);
        }

        if (!ShouldUpdateDraft(translation.DraftSourceVersion, job.SourceVersion))
        {
            return;
        }

        translation.DraftName = translatedFields.Name.Trim();
        translation.DraftDescription = NormalizeOptional(translatedFields.Description);
        translation.DraftSource = TranslationSource.Machine;
        translation.DraftSourceVersion = job.SourceVersion;
        translation.DraftStatus = TranslationStatus.NeedsReview;
        translation.DraftGeneratedAt = now;
        translation.DraftLastError = null;
    }

    private static bool ShouldUpdateDraft(int? existingDraftSourceVersion, int incomingSourceVersion) =>
        existingDraftSourceVersion is null || incomingSourceVersion > existingDraftSourceVersion;

    private static void MarkSkipped(TranslationJob job, DateTime now)
    {
        job.Status = TranslationJobStatus.Skipped;
        job.CompletedAt = now;
        job.NextAttemptAt = null;
        TranslationJobLease.Clear(job);
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

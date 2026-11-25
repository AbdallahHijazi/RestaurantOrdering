using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Common.Translation;

public sealed class TranslationJobEnqueuer : ITranslationJobEnqueuer
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public TranslationJobEnqueuer(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task EnqueueForEntityAsync(
        Guid restaurantId,
        TranslatableEntityType entityType,
        Guid entityId,
        int contentVersion,
        CancellationToken cancellationToken)
    {
        var settings = await _context.RestaurantSettings
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.RestaurantId == restaurantId, cancellationToken);

        if (settings is null || settings.TranslationMode == TranslationMode.ManualOnly)
        {
            return;
        }

        var sourceLocale = settings.DefaultLocale;
        var targetLocales = await _context.RestaurantSupportedLocales
            .AsNoTracking()
            .Where(item =>
                item.RestaurantId == restaurantId
                && item.IsEnabled
                && item.LocaleCode != sourceLocale)
            .OrderBy(item => item.SortOrder)
            .Select(item => item.LocaleCode)
            .ToListAsync(cancellationToken);

        if (targetLocales.Count == 0)
        {
            return;
        }

        var existingKeySet = new HashSet<string>(StringComparer.Ordinal);

        var persistedKeys = await _context.TranslationJobs
            .AsNoTracking()
            .Where(item => item.RestaurantId == restaurantId && item.EntityId == entityId)
            .Select(item => item.IdempotencyKey)
            .ToListAsync(cancellationToken);

        foreach (var key in persistedKeys)
        {
            existingKeySet.Add(key);
        }

        foreach (var trackedJob in _context.TranslationJobs.Local)
        {
            if (trackedJob.RestaurantId == restaurantId && trackedJob.EntityId == entityId)
            {
                existingKeySet.Add(trackedJob.IdempotencyKey);
            }
        }

        var now = _dateTimeService.UtcNow;

        foreach (var targetLocale in targetLocales)
        {
            var idempotencyKey = TranslationJobIdempotency.BuildKey(
                entityType,
                entityId,
                targetLocale,
                contentVersion);

            if (existingKeySet.Contains(idempotencyKey))
            {
                continue;
            }

            _context.TranslationJobs.Add(new TranslationJob
            {
                RestaurantId = restaurantId,
                EntityType = entityType,
                EntityId = entityId,
                TargetLocaleCode = targetLocale,
                SourceLocaleCode = sourceLocale,
                SourceVersion = contentVersion,
                Status = TranslationJobStatus.Queued,
                IdempotencyKey = idempotencyKey,
                CreatedAt = now
            });

            existingKeySet.Add(idempotencyKey);
        }
    }
}

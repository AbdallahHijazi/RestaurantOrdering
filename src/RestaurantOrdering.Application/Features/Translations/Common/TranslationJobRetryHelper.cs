using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Common.Translation;
using RestaurantOrdering.Application.Features.Translations.Common;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Translations.Common;

internal static class TranslationJobRetryHelper
{
    public static async Task RetryAsync(
        IApplicationDbContext context,
        IDateTimeService dateTimeService,
        ResolvedTranslation resolved,
        CancellationToken cancellationToken)
    {
        var settings = await context.RestaurantSettings
            .AsNoTracking()
            .SingleAsync(item => item.RestaurantId == resolved.RestaurantId, cancellationToken);

        var entityType = resolved.Kind switch
        {
            TranslationReviewKind.Restaurant => TranslatableEntityType.Restaurant,
            TranslationReviewKind.Category => TranslatableEntityType.Category,
            TranslationReviewKind.MenuItem => TranslatableEntityType.MenuItem,
            _ => throw new InvalidOperationException("Unknown translation review kind.")
        };

        var idempotencyKey = TranslationJobIdempotency.BuildKey(
            entityType,
            resolved.EntityId,
            resolved.LocaleCode,
            resolved.ContentVersion);

        var existingJob = await context.TranslationJobs
            .FirstOrDefaultAsync(item => item.IdempotencyKey == idempotencyKey, cancellationToken);

        if (existingJob is not null)
        {
            if (existingJob.Status is TranslationJobStatus.Queued or TranslationJobStatus.Running)
            {
                return;
            }

            existingJob.Status = TranslationJobStatus.Queued;
            existingJob.AttemptCount = 0;
            existingJob.NextAttemptAt = null;
            existingJob.LastError = null;
            existingJob.CompletedAt = null;
            return;
        }

        context.TranslationJobs.Add(new TranslationJob
        {
            RestaurantId = resolved.RestaurantId,
            EntityType = entityType,
            EntityId = resolved.EntityId,
            TargetLocaleCode = resolved.LocaleCode,
            SourceLocaleCode = settings.DefaultLocale,
            SourceVersion = resolved.ContentVersion,
            Status = TranslationJobStatus.Queued,
            IdempotencyKey = idempotencyKey,
            CreatedAt = dateTimeService.UtcNow
        });
    }
}

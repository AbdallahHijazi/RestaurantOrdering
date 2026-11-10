using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Domain.Entities;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Translations.Common;

internal enum TranslationReviewKind
{
    Restaurant,
    Category,
    MenuItem
}

internal sealed class ResolvedTranslation
{
    public TranslationReviewKind Kind { get; init; }
    public Guid TranslationId { get; init; }
    public Guid RestaurantId { get; init; }
    public Guid EntityId { get; init; }
    public string LocaleCode { get; init; } = string.Empty;
    public int ContentVersion { get; init; }
    public string EntityDisplayName { get; init; } = string.Empty;
    public RestaurantTranslation? RestaurantTranslation { get; init; }
    public CategoryTranslation? CategoryTranslation { get; init; }
    public MenuItemTranslation? MenuItemTranslation { get; init; }

    public TranslationReviewSnapshot ToSnapshot(bool hasFailedJobForCurrentVersion) =>
        Kind switch
        {
            TranslationReviewKind.Restaurant => CreateSnapshot(
                TranslationReviewKind.Restaurant,
                RestaurantTranslation!,
                EntityId,
                RestaurantId,
                ContentVersion,
                EntityDisplayName,
                hasFailedJobForCurrentVersion),
            TranslationReviewKind.Category => CreateSnapshot(
                TranslationReviewKind.Category,
                CategoryTranslation!,
                EntityId,
                RestaurantId,
                ContentVersion,
                EntityDisplayName,
                hasFailedJobForCurrentVersion),
            TranslationReviewKind.MenuItem => CreateSnapshot(
                TranslationReviewKind.MenuItem,
                MenuItemTranslation!,
                EntityId,
                RestaurantId,
                ContentVersion,
                EntityDisplayName,
                hasFailedJobForCurrentVersion),
            _ => throw new InvalidOperationException("Unknown translation review kind.")
        };

    private static TranslationReviewSnapshot CreateSnapshot(
        TranslationReviewKind kind,
        RestaurantTranslation translation,
        Guid entityId,
        Guid restaurantId,
        int contentVersion,
        string displayName,
        bool hasFailedJob) =>
        new()
        {
            TranslationId = translation.Id,
            EntityType = TranslatableEntityType.Restaurant,
            EntityId = entityId,
            RestaurantId = restaurantId,
            LocaleCode = translation.LocaleCode,
            EntityDisplayName = displayName,
            ContentVersion = contentVersion,
            DraftStatus = translation.DraftStatus,
            DraftSource = translation.DraftSource,
            DraftName = translation.DraftName,
            DraftDescription = translation.DraftDescription,
            DraftAddress = translation.DraftAddress,
            PublishedName = translation.Name,
            PublishedDescription = translation.Description,
            PublishedAddress = translation.Address,
            DraftSourceVersion = translation.DraftSourceVersion,
            UpdatedAt = translation.UpdatedAt ?? translation.CreatedAt,
            HasFailedJobForCurrentVersion = hasFailedJob
        };

    private static TranslationReviewSnapshot CreateSnapshot(
        TranslationReviewKind kind,
        CategoryTranslation translation,
        Guid entityId,
        Guid restaurantId,
        int contentVersion,
        string displayName,
        bool hasFailedJob) =>
        new()
        {
            TranslationId = translation.Id,
            EntityType = TranslatableEntityType.Category,
            EntityId = entityId,
            RestaurantId = restaurantId,
            LocaleCode = translation.LocaleCode,
            EntityDisplayName = displayName,
            ContentVersion = contentVersion,
            DraftStatus = translation.DraftStatus,
            DraftSource = translation.DraftSource,
            DraftName = translation.DraftName,
            DraftDescription = translation.DraftDescription,
            PublishedName = translation.Name,
            PublishedDescription = translation.Description,
            DraftSourceVersion = translation.DraftSourceVersion,
            UpdatedAt = translation.UpdatedAt ?? translation.CreatedAt,
            HasFailedJobForCurrentVersion = hasFailedJob
        };

    private static TranslationReviewSnapshot CreateSnapshot(
        TranslationReviewKind kind,
        MenuItemTranslation translation,
        Guid entityId,
        Guid restaurantId,
        int contentVersion,
        string displayName,
        bool hasFailedJob) =>
        new()
        {
            TranslationId = translation.Id,
            EntityType = TranslatableEntityType.MenuItem,
            EntityId = entityId,
            RestaurantId = restaurantId,
            LocaleCode = translation.LocaleCode,
            EntityDisplayName = displayName,
            ContentVersion = contentVersion,
            DraftStatus = translation.DraftStatus,
            DraftSource = translation.DraftSource,
            DraftName = translation.DraftName,
            DraftDescription = translation.DraftDescription,
            PublishedName = translation.Name,
            PublishedDescription = translation.Description,
            DraftSourceVersion = translation.DraftSourceVersion,
            UpdatedAt = translation.UpdatedAt ?? translation.CreatedAt,
            HasFailedJobForCurrentVersion = hasFailedJob
        };
}

internal static class TranslationReviewLoader
{
    public static async Task<ResolvedTranslation> ResolveAsync(
        IApplicationDbContext context,
        Guid restaurantId,
        Guid translationId,
        CancellationToken cancellationToken)
    {
        var restaurantTranslation = await context.RestaurantTranslations
            .Include(item => item.Restaurant)
            .FirstOrDefaultAsync(item => item.Id == translationId, cancellationToken);

        if (restaurantTranslation is not null)
        {
            if (restaurantTranslation.RestaurantId != restaurantId || restaurantTranslation.Restaurant.IsDeleted)
            {
                throw new TranslationReviewNotFoundException();
            }

            return new ResolvedTranslation
            {
                Kind = TranslationReviewKind.Restaurant,
                TranslationId = restaurantTranslation.Id,
                RestaurantId = restaurantTranslation.RestaurantId,
                EntityId = restaurantTranslation.RestaurantId,
                LocaleCode = restaurantTranslation.LocaleCode,
                ContentVersion = restaurantTranslation.Restaurant.ContentVersion,
                EntityDisplayName = restaurantTranslation.Restaurant.NameAr,
                RestaurantTranslation = restaurantTranslation
            };
        }

        var categoryTranslation = await context.CategoryTranslations
            .Include(item => item.Category)
            .FirstOrDefaultAsync(item => item.Id == translationId, cancellationToken);

        if (categoryTranslation is not null)
        {
            if (categoryTranslation.Category.RestaurantId != restaurantId || categoryTranslation.Category.IsDeleted)
            {
                throw new TranslationReviewNotFoundException();
            }

            return new ResolvedTranslation
            {
                Kind = TranslationReviewKind.Category,
                TranslationId = categoryTranslation.Id,
                RestaurantId = categoryTranslation.Category.RestaurantId,
                EntityId = categoryTranslation.CategoryId,
                LocaleCode = categoryTranslation.LocaleCode,
                ContentVersion = categoryTranslation.Category.ContentVersion,
                EntityDisplayName = categoryTranslation.Category.NameAr,
                CategoryTranslation = categoryTranslation
            };
        }

        var menuItemTranslation = await context.MenuItemTranslations
            .Include(item => item.MenuItem)
            .FirstOrDefaultAsync(item => item.Id == translationId, cancellationToken);

        if (menuItemTranslation is not null)
        {
            if (menuItemTranslation.MenuItem.RestaurantId != restaurantId || menuItemTranslation.MenuItem.IsDeleted)
            {
                throw new TranslationReviewNotFoundException();
            }

            return new ResolvedTranslation
            {
                Kind = TranslationReviewKind.MenuItem,
                TranslationId = menuItemTranslation.Id,
                RestaurantId = menuItemTranslation.MenuItem.RestaurantId,
                EntityId = menuItemTranslation.MenuItemId,
                LocaleCode = menuItemTranslation.LocaleCode,
                ContentVersion = menuItemTranslation.MenuItem.ContentVersion,
                EntityDisplayName = menuItemTranslation.MenuItem.NameAr,
                MenuItemTranslation = menuItemTranslation
            };
        }

        throw new TranslationReviewNotFoundException();
    }

    public static async Task<IReadOnlyList<TranslationReviewSnapshot>> ListAsync(
        IApplicationDbContext context,
        Guid restaurantId,
        TranslatableEntityType? entityType,
        string? locale,
        TranslationStatus? status,
        CancellationToken cancellationToken)
    {
        var snapshots = new List<TranslationReviewSnapshot>();

        if (entityType is null or TranslatableEntityType.Restaurant)
        {
            snapshots.AddRange(await LoadRestaurantSnapshotsAsync(context, restaurantId, locale, status, cancellationToken));
        }

        if (entityType is null or TranslatableEntityType.Category)
        {
            snapshots.AddRange(await LoadCategorySnapshotsAsync(context, restaurantId, locale, status, cancellationToken));
        }

        if (entityType is null or TranslatableEntityType.MenuItem)
        {
            snapshots.AddRange(await LoadMenuItemSnapshotsAsync(context, restaurantId, locale, status, cancellationToken));
        }

        return snapshots
            .OrderByDescending(item => item.UpdatedAt ?? DateTime.MinValue)
            .ThenBy(item => item.EntityType)
            .ThenBy(item => item.EntityDisplayName)
            .ToList();
    }

    public static async Task<bool> HasFailedJobForCurrentVersionAsync(
        IApplicationDbContext context,
        TranslatableEntityType entityType,
        Guid entityId,
        string localeCode,
        int contentVersion,
        CancellationToken cancellationToken) =>
        await context.TranslationJobs.AnyAsync(
            item => item.EntityType == entityType
                    && item.EntityId == entityId
                    && item.TargetLocaleCode == localeCode
                    && item.SourceVersion == contentVersion
                    && item.Status == TranslationJobStatus.Failed,
            cancellationToken);

    private static async Task<IReadOnlyList<TranslationReviewSnapshot>> LoadRestaurantSnapshotsAsync(
        IApplicationDbContext context,
        Guid restaurantId,
        string? locale,
        TranslationStatus? status,
        CancellationToken cancellationToken)
    {
        var query = context.RestaurantTranslations
            .AsNoTracking()
            .Include(item => item.Restaurant)
            .Where(item => item.RestaurantId == restaurantId && !item.Restaurant.IsDeleted)
            .Where(item => item.DraftStatus != null);

        query = ApplyReviewQueueFilter(query);
        query = ApplyLocaleFilter(query, locale);
        query = ApplyStatusFilter(query, status);

        var rows = await query.ToListAsync(cancellationToken);
        var snapshots = new List<TranslationReviewSnapshot>();

        foreach (var row in rows)
        {
            var hasFailedJob = await HasFailedJobForCurrentVersionAsync(
                context,
                TranslatableEntityType.Restaurant,
                row.RestaurantId,
                row.LocaleCode,
                row.Restaurant.ContentVersion,
                cancellationToken);

            snapshots.Add(new TranslationReviewSnapshot
            {
                TranslationId = row.Id,
                EntityType = TranslatableEntityType.Restaurant,
                EntityId = row.RestaurantId,
                RestaurantId = row.RestaurantId,
                LocaleCode = row.LocaleCode,
                EntityDisplayName = row.Restaurant.NameAr,
                ContentVersion = row.Restaurant.ContentVersion,
                DraftStatus = row.DraftStatus,
                DraftSource = row.DraftSource,
                DraftName = row.DraftName,
                DraftDescription = row.DraftDescription,
                DraftAddress = row.DraftAddress,
                PublishedName = row.Name,
                PublishedDescription = row.Description,
                PublishedAddress = row.Address,
                DraftSourceVersion = row.DraftSourceVersion,
                UpdatedAt = row.UpdatedAt ?? row.CreatedAt,
                HasFailedJobForCurrentVersion = hasFailedJob
            });
        }

        return snapshots;
    }

    private static async Task<IReadOnlyList<TranslationReviewSnapshot>> LoadCategorySnapshotsAsync(
        IApplicationDbContext context,
        Guid restaurantId,
        string? locale,
        TranslationStatus? status,
        CancellationToken cancellationToken)
    {
        var query = context.CategoryTranslations
            .AsNoTracking()
            .Include(item => item.Category)
            .Where(item => item.Category.RestaurantId == restaurantId && !item.Category.IsDeleted)
            .Where(item => item.DraftStatus != null);

        query = ApplyReviewQueueFilter(query);
        query = ApplyLocaleFilter(query, locale);
        query = ApplyStatusFilter(query, status);

        var rows = await query.ToListAsync(cancellationToken);
        var snapshots = new List<TranslationReviewSnapshot>();

        foreach (var row in rows)
        {
            var hasFailedJob = await HasFailedJobForCurrentVersionAsync(
                context,
                TranslatableEntityType.Category,
                row.CategoryId,
                row.LocaleCode,
                row.Category.ContentVersion,
                cancellationToken);

            snapshots.Add(new TranslationReviewSnapshot
            {
                TranslationId = row.Id,
                EntityType = TranslatableEntityType.Category,
                EntityId = row.CategoryId,
                RestaurantId = row.Category.RestaurantId,
                LocaleCode = row.LocaleCode,
                EntityDisplayName = row.Category.NameAr,
                ContentVersion = row.Category.ContentVersion,
                DraftStatus = row.DraftStatus,
                DraftSource = row.DraftSource,
                DraftName = row.DraftName,
                DraftDescription = row.DraftDescription,
                PublishedName = row.Name,
                PublishedDescription = row.Description,
                DraftSourceVersion = row.DraftSourceVersion,
                UpdatedAt = row.UpdatedAt ?? row.CreatedAt,
                HasFailedJobForCurrentVersion = hasFailedJob
            });
        }

        return snapshots;
    }

    private static async Task<IReadOnlyList<TranslationReviewSnapshot>> LoadMenuItemSnapshotsAsync(
        IApplicationDbContext context,
        Guid restaurantId,
        string? locale,
        TranslationStatus? status,
        CancellationToken cancellationToken)
    {
        var query = context.MenuItemTranslations
            .AsNoTracking()
            .Include(item => item.MenuItem)
            .Where(item => item.MenuItem.RestaurantId == restaurantId && !item.MenuItem.IsDeleted)
            .Where(item => item.DraftStatus != null);

        query = ApplyReviewQueueFilter(query);
        query = ApplyLocaleFilter(query, locale);
        query = ApplyStatusFilter(query, status);

        var rows = await query.ToListAsync(cancellationToken);
        var snapshots = new List<TranslationReviewSnapshot>();

        foreach (var row in rows)
        {
            var hasFailedJob = await HasFailedJobForCurrentVersionAsync(
                context,
                TranslatableEntityType.MenuItem,
                row.MenuItemId,
                row.LocaleCode,
                row.MenuItem.ContentVersion,
                cancellationToken);

            snapshots.Add(new TranslationReviewSnapshot
            {
                TranslationId = row.Id,
                EntityType = TranslatableEntityType.MenuItem,
                EntityId = row.MenuItemId,
                RestaurantId = row.MenuItem.RestaurantId,
                LocaleCode = row.LocaleCode,
                EntityDisplayName = row.MenuItem.NameAr,
                ContentVersion = row.MenuItem.ContentVersion,
                DraftStatus = row.DraftStatus,
                DraftSource = row.DraftSource,
                DraftName = row.DraftName,
                DraftDescription = row.DraftDescription,
                PublishedName = row.Name,
                PublishedDescription = row.Description,
                DraftSourceVersion = row.DraftSourceVersion,
                UpdatedAt = row.UpdatedAt ?? row.CreatedAt,
                HasFailedJobForCurrentVersion = hasFailedJob
            });
        }

        return snapshots;
    }

    private static IQueryable<RestaurantTranslation> ApplyReviewQueueFilter(IQueryable<RestaurantTranslation> query) =>
        query.Where(item =>
            item.DraftStatus == TranslationStatus.NeedsReview
            || item.DraftStatus == TranslationStatus.Failed);

    private static IQueryable<CategoryTranslation> ApplyReviewQueueFilter(IQueryable<CategoryTranslation> query) =>
        query.Where(item =>
            item.DraftStatus == TranslationStatus.NeedsReview
            || item.DraftStatus == TranslationStatus.Failed);

    private static IQueryable<MenuItemTranslation> ApplyReviewQueueFilter(IQueryable<MenuItemTranslation> query) =>
        query.Where(item =>
            item.DraftStatus == TranslationStatus.NeedsReview
            || item.DraftStatus == TranslationStatus.Failed);

    private static IQueryable<RestaurantTranslation> ApplyLocaleFilter(
        IQueryable<RestaurantTranslation> query,
        string? locale) =>
        string.IsNullOrWhiteSpace(locale)
            ? query
            : query.Where(item => item.LocaleCode == locale.Trim());

    private static IQueryable<CategoryTranslation> ApplyLocaleFilter(
        IQueryable<CategoryTranslation> query,
        string? locale) =>
        string.IsNullOrWhiteSpace(locale)
            ? query
            : query.Where(item => item.LocaleCode == locale.Trim());

    private static IQueryable<MenuItemTranslation> ApplyLocaleFilter(
        IQueryable<MenuItemTranslation> query,
        string? locale) =>
        string.IsNullOrWhiteSpace(locale)
            ? query
            : query.Where(item => item.LocaleCode == locale.Trim());

    private static IQueryable<RestaurantTranslation> ApplyStatusFilter(
        IQueryable<RestaurantTranslation> query,
        TranslationStatus? status) =>
        status is null ? query : query.Where(item => item.DraftStatus == status);

    private static IQueryable<CategoryTranslation> ApplyStatusFilter(
        IQueryable<CategoryTranslation> query,
        TranslationStatus? status) =>
        status is null ? query : query.Where(item => item.DraftStatus == status);

    private static IQueryable<MenuItemTranslation> ApplyStatusFilter(
        IQueryable<MenuItemTranslation> query,
        TranslationStatus? status) =>
        status is null ? query : query.Where(item => item.DraftStatus == status);
}

internal sealed class TranslationReviewNotFoundException : Exception;

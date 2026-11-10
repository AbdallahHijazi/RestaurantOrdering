using System.Text.Json;
using FluentValidation;
using MediatR;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Translations.Common;
using RestaurantOrdering.Application.Features.Translations.DTOs;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Translations.Commands.BulkApproveTranslations;

public sealed class BulkApproveTranslationsCommandHandler
    : IRequestHandler<BulkApproveTranslationsCommand, IReadOnlyList<TranslationReviewDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IRestaurantPermissionService _permissionService;
    private readonly IDateTimeService _dateTimeService;

    public BulkApproveTranslationsCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IRestaurantPermissionService permissionService,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _permissionService = permissionService;
        _dateTimeService = dateTimeService;
    }

    public async Task<IReadOnlyList<TranslationReviewDto>> Handle(
        BulkApproveTranslationsCommand request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedAccessException("Authentication is required.");

        await _permissionService.EnsurePermissionAsync(
            userId,
            request.RestaurantId,
            RestaurantPermission.TranslationsBulkApprove,
            cancellationToken);

        var resolvedItems = new List<ResolvedTranslation>();

        foreach (var translationId in request.TranslationIds)
        {
            try
            {
                var resolved = await TranslationReviewLoader.ResolveAsync(
                    _context,
                    request.RestaurantId,
                    translationId,
                    cancellationToken);

                TranslationReviewValidation.EnsureApprovable(resolved);
                resolvedItems.Add(resolved);
            }
            catch (TranslationReviewNotFoundException)
            {
                throw new NotFoundException("Translation", translationId);
            }
            catch (ValidationException)
            {
                throw;
            }
        }

        var approvedAt = _dateTimeService.UtcNow;

        foreach (var resolved in resolvedItems)
        {
            TranslationReviewMutations.ApplyApproval(resolved, userId, approvedAt);
        }

        _context.TranslationAuditLogs.Add(TranslationReviewAudit.Create(
            request.RestaurantId,
            userId,
            TranslationAuditEventType.BulkTranslationsApproved,
            resolvedItems[0].Kind switch
            {
                TranslationReviewKind.Restaurant => TranslatableEntityType.Restaurant,
                TranslationReviewKind.Category => TranslatableEntityType.Category,
                TranslationReviewKind.MenuItem => TranslatableEntityType.MenuItem,
                _ => throw new InvalidOperationException("Unknown translation review kind.")
            },
            resolvedItems[0].EntityId,
            localeCode: null,
            approvedAt,
            JsonSerializer.Serialize(new
            {
                count = resolvedItems.Count,
                translationIds = request.TranslationIds
            })));

        await _context.SaveChangesAsync(cancellationToken);

        var results = new List<TranslationReviewDto>();

        foreach (var resolved in resolvedItems)
        {
            var hasFailedJob = await TranslationReviewLoader.HasFailedJobForCurrentVersionAsync(
                _context,
                ToEntityType(resolved.Kind),
                resolved.EntityId,
                resolved.LocaleCode,
                resolved.ContentVersion,
                cancellationToken);

            results.Add(TranslationReviewMappings.ToDto(resolved.ToSnapshot(hasFailedJob)));
        }

        return results;
    }

    private static TranslatableEntityType ToEntityType(TranslationReviewKind kind) =>
        kind switch
        {
            TranslationReviewKind.Restaurant => TranslatableEntityType.Restaurant,
            TranslationReviewKind.Category => TranslatableEntityType.Category,
            TranslationReviewKind.MenuItem => TranslatableEntityType.MenuItem,
            _ => throw new InvalidOperationException("Unknown translation review kind.")
        };
}

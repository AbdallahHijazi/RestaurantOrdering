using MediatR;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Translations.Common;
using RestaurantOrdering.Application.Features.Translations.DTOs;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Translations.Commands.ApproveTranslation;

public sealed class ApproveTranslationCommandHandler
    : IRequestHandler<ApproveTranslationCommand, TranslationReviewDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IRestaurantPermissionService _permissionService;
    private readonly IDateTimeService _dateTimeService;

    public ApproveTranslationCommandHandler(
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

    public async Task<TranslationReviewDto> Handle(
        ApproveTranslationCommand request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedAccessException("Authentication is required.");

        await _permissionService.EnsurePermissionAsync(
            userId,
            request.RestaurantId,
            RestaurantPermission.TranslationsApprove,
            cancellationToken);

        try
        {
            var resolved = await TranslationReviewLoader.ResolveAsync(
                _context,
                request.RestaurantId,
                request.TranslationId,
                cancellationToken);

            TranslationReviewValidation.EnsureApprovable(resolved);

            var approvedAt = _dateTimeService.UtcNow;
            TranslationReviewMutations.ApplyApproval(resolved, userId, approvedAt);

            TranslationReviewAudit.Add(
                _context,
                request.RestaurantId,
                userId,
                TranslationAuditEventType.TranslationApproved,
                resolved,
                _dateTimeService);

            await _context.SaveChangesAsync(cancellationToken);

            var hasFailedJob = await TranslationReviewLoader.HasFailedJobForCurrentVersionAsync(
                _context,
                ToEntityType(resolved.Kind),
                resolved.EntityId,
                resolved.LocaleCode,
                resolved.ContentVersion,
                cancellationToken);

            return TranslationReviewMappings.ToDto(resolved.ToSnapshot(hasFailedJob));
        }
        catch (TranslationReviewNotFoundException)
        {
            throw new NotFoundException("Translation", request.TranslationId);
        }
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

using MediatR;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Translations.Common;
using RestaurantOrdering.Application.Features.Translations.DTOs;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Translations.Queries.GetTranslationById;

public sealed class GetTranslationByIdQueryHandler
    : IRequestHandler<GetTranslationByIdQuery, TranslationReviewDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IRestaurantPermissionService _permissionService;

    public GetTranslationByIdQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IRestaurantPermissionService permissionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _permissionService = permissionService;
    }

    public async Task<TranslationReviewDto> Handle(
        GetTranslationByIdQuery request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedAccessException("Authentication is required.");

        await _permissionService.EnsurePermissionAsync(
            userId,
            request.RestaurantId,
            RestaurantPermission.TranslationsView,
            cancellationToken);

        try
        {
            var resolved = await TranslationReviewLoader.ResolveAsync(
                _context,
                request.RestaurantId,
                request.TranslationId,
                cancellationToken);

            var hasFailedJob = await TranslationReviewLoader.HasFailedJobForCurrentVersionAsync(
                _context,
                resolved.Kind switch
                {
                    TranslationReviewKind.Restaurant => TranslatableEntityType.Restaurant,
                    TranslationReviewKind.Category => TranslatableEntityType.Category,
                    TranslationReviewKind.MenuItem => TranslatableEntityType.MenuItem,
                    _ => throw new InvalidOperationException("Unknown translation review kind.")
                },
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
}

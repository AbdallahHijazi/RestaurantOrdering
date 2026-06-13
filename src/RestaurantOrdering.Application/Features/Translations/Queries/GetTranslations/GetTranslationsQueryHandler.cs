using MediatR;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Translations.Common;
using RestaurantOrdering.Application.Features.Translations.DTOs;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Translations.Queries.GetTranslations;

public sealed class GetTranslationsQueryHandler
    : IRequestHandler<GetTranslationsQuery, PagedTranslationReviewResultDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IRestaurantPermissionService _permissionService;

    public GetTranslationsQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IRestaurantPermissionService permissionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _permissionService = permissionService;
    }

    public async Task<PagedTranslationReviewResultDto> Handle(
        GetTranslationsQuery request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedAccessException("Authentication is required.");

        await _permissionService.EnsurePermissionAsync(
            userId,
            request.RestaurantId,
            RestaurantPermission.TranslationsView,
            cancellationToken);

        var snapshots = await TranslationReviewLoader.ListAsync(
            _context,
            request.RestaurantId,
            request.EntityType,
            request.Locale,
            request.Status,
            cancellationToken);

        var totalCount = snapshots.Count;
        var items = snapshots
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(TranslationReviewMappings.ToDto)
            .ToList();

        return new PagedTranslationReviewResultDto
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = totalCount
        };
    }
}

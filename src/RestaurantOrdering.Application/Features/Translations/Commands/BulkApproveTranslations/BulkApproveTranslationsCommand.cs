using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Translations.DTOs;

namespace RestaurantOrdering.Application.Features.Translations.Commands.BulkApproveTranslations;

public sealed record BulkApproveTranslationsCommand(
    Guid RestaurantId,
    IReadOnlyList<Guid> TranslationIds)
    : IRequest<IReadOnlyList<TranslationReviewDto>>, IRestaurantDashboardScopedRequest;

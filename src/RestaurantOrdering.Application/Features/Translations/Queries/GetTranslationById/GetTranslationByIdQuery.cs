using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Translations.DTOs;

namespace RestaurantOrdering.Application.Features.Translations.Queries.GetTranslationById;

public sealed record GetTranslationByIdQuery(
    Guid RestaurantId,
    Guid TranslationId)
    : IRequest<TranslationReviewDto>, IRestaurantDashboardScopedRequest;

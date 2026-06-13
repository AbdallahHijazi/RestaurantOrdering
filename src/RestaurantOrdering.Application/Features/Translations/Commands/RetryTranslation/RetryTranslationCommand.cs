using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Translations.DTOs;

namespace RestaurantOrdering.Application.Features.Translations.Commands.RetryTranslation;

public sealed record RetryTranslationCommand(
    Guid RestaurantId,
    Guid TranslationId)
    : IRequest<TranslationReviewDto>, IRestaurantDashboardScopedRequest;

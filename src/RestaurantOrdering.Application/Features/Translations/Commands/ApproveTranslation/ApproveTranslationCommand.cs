using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Translations.DTOs;

namespace RestaurantOrdering.Application.Features.Translations.Commands.ApproveTranslation;

public sealed record ApproveTranslationCommand(
    Guid RestaurantId,
    Guid TranslationId)
    : IRequest<TranslationReviewDto>, IRestaurantDashboardScopedRequest;

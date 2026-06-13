using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Translations.DTOs;

namespace RestaurantOrdering.Application.Features.Translations.Commands.UpdateTranslationDraft;

public sealed record UpdateTranslationDraftCommand(
    Guid RestaurantId,
    Guid TranslationId,
    string Name,
    string? Description,
    string? Address)
    : IRequest<TranslationReviewDto>, IRestaurantDashboardScopedRequest;

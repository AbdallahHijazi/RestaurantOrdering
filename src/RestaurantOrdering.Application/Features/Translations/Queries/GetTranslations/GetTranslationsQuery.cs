using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Translations.DTOs;
using RestaurantOrdering.Domain.Enums;

namespace RestaurantOrdering.Application.Features.Translations.Queries.GetTranslations;

public sealed record GetTranslationsQuery(
    Guid RestaurantId,
    TranslatableEntityType? EntityType,
    string? Locale,
    TranslationStatus? Status,
    int Page = 1,
    int PageSize = 20)
    : IRequest<PagedTranslationReviewResultDto>, IRestaurantDashboardScopedRequest;

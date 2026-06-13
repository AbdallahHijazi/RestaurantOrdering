using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Locales.DTOs;
using MediatR;

namespace RestaurantOrdering.Application.Features.Locales.Queries.GetSystemLocales;

public sealed record GetSystemLocalesQuery : IRequest<IReadOnlyList<SystemLocaleDto>>;

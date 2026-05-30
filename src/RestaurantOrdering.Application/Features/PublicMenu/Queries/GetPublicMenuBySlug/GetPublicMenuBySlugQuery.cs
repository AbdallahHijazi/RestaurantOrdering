using MediatR;
using RestaurantOrdering.Application.Features.PublicMenu.DTOs;

namespace RestaurantOrdering.Application.Features.PublicMenu.Queries.GetPublicMenuBySlug;

public sealed record GetPublicMenuBySlugQuery(string RestaurantSlug) : IRequest<PublicMenuDto>;

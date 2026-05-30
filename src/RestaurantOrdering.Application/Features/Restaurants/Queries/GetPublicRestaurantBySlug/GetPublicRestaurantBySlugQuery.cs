using MediatR;
using RestaurantOrdering.Application.Features.Restaurants.DTOs;

namespace RestaurantOrdering.Application.Features.Restaurants.Queries.GetPublicRestaurantBySlug;

public sealed record GetPublicRestaurantBySlugQuery(string Slug) : IRequest<PublicRestaurantDto>;

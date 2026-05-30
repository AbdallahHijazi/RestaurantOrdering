using MediatR;
using RestaurantOrdering.Application.Features.Categories.DTOs;

namespace RestaurantOrdering.Application.Features.Categories.Queries.GetCategories;

public sealed record GetCategoriesQuery(Guid RestaurantId) : IRequest<IReadOnlyList<CategoryDto>>;

using MediatR;
using RestaurantOrdering.Application.Features.Categories.DTOs;

namespace RestaurantOrdering.Application.Features.Categories.Queries.GetCategoryById;

public sealed record GetCategoryByIdQuery(Guid CategoryId, Guid RestaurantId) : IRequest<CategoryDto>;

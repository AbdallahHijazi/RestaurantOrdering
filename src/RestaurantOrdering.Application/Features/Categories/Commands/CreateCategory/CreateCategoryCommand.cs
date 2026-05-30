using MediatR;
using RestaurantOrdering.Application.Features.Categories.DTOs;

namespace RestaurantOrdering.Application.Features.Categories.Commands.CreateCategory;

public sealed record CreateCategoryCommand(
    Guid RestaurantId,
    string NameAr,
    string? NameEn,
    string? DescriptionAr,
    string? DescriptionEn,
    int DisplayOrder,
    bool IsActive) : IRequest<CategoryDto>;

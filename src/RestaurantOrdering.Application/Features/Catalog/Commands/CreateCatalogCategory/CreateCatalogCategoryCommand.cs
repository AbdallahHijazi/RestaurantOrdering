using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Categories.DTOs;

namespace RestaurantOrdering.Application.Features.Catalog.Commands.CreateCatalogCategory;

public sealed record CreateCatalogCategoryCommand(
    Guid RestaurantId,
    string Name,
    string? Description,
    int DisplayOrder,
    bool IsActive)
    : IRequest<CategoryDto>, IRestaurantDashboardScopedRequest;

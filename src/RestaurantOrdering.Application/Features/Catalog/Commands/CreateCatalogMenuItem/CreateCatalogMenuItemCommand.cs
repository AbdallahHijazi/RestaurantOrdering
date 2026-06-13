using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;

namespace RestaurantOrdering.Application.Features.Catalog.Commands.CreateCatalogMenuItem;

public sealed record CreateCatalogMenuItemCommand(
    Guid RestaurantId,
    Guid CategoryId,
    string Name,
    string? Description,
    decimal Price,
    decimal? DiscountPrice,
    Guid? ImageFileId,
    int DisplayOrder,
    bool IsAvailable,
    bool IsActive)
    : IRequest<MenuItemDto>, IRestaurantDashboardScopedRequest;

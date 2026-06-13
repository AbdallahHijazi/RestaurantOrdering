using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;

namespace RestaurantOrdering.Application.Features.Catalog.Commands.UpdateCatalogMenuItem;

public sealed record UpdateCatalogMenuItemCommand(
    Guid MenuItemId,
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

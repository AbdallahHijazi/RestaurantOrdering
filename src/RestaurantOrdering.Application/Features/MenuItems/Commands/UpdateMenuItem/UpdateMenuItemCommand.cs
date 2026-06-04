using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;

namespace RestaurantOrdering.Application.Features.MenuItems.Commands.UpdateMenuItem;

public sealed record UpdateMenuItemCommand(
    Guid MenuItemId,
    Guid RestaurantId,
    Guid CategoryId,
    Guid? ImageFileId,
    string NameAr,
    string? NameEn,
    string? DescriptionAr,
    string? DescriptionEn,
    decimal Price,
    decimal? DiscountPrice,
    int DisplayOrder,
    bool IsAvailable,
    bool IsActive) : IRequest<MenuItemDto>, IRestaurantDashboardScopedRequest;

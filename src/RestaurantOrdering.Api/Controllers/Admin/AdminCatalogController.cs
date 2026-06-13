using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantOrdering.Api.Contracts.Admin.Catalog;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Catalog.Commands.CreateCatalogCategory;
using RestaurantOrdering.Application.Features.Catalog.Commands.CreateCatalogMenuItem;
using RestaurantOrdering.Application.Features.Catalog.Commands.UpdateCatalogCategory;
using RestaurantOrdering.Application.Features.Catalog.Commands.UpdateCatalogMenuItem;
using RestaurantOrdering.Application.Features.Catalog.Commands.UpdateRestaurantProfileContent;
using RestaurantOrdering.Application.Features.Categories.DTOs;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;
using RestaurantOrdering.Application.Features.Restaurants.DTOs;

namespace RestaurantOrdering.Api.Controllers.Admin;

[ApiController]
[Authorize(Policy = ApplicationPolicies.RestaurantDashboardAccess)]
[Route("api/v1/admin/restaurants/{restaurantId:guid}/catalog")]
public sealed class AdminCatalogController : ControllerBase
{
    private readonly ISender _sender;

    public AdminCatalogController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPost("categories")]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(CategoryDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<CategoryDto>> CreateCategory(
        Guid restaurantId,
        [FromBody] CreateCatalogCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateCatalogCategoryCommand(
            restaurantId,
            request.Name,
            request.Description,
            request.DisplayOrder,
            request.IsActive);

        var result = await _sender.Send(command, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpPut("categories/{categoryId:guid}")]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(CategoryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CategoryDto>> UpdateCategory(
        Guid restaurantId,
        Guid categoryId,
        [FromBody] UpdateCatalogCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateCatalogCategoryCommand(
            categoryId,
            restaurantId,
            request.Name,
            request.Description,
            request.DisplayOrder,
            request.IsActive);

        var result = await _sender.Send(command, cancellationToken);
        return Ok(result);
    }

    [HttpPost("menu-items")]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(MenuItemDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<MenuItemDto>> CreateMenuItem(
        Guid restaurantId,
        [FromBody] CreateCatalogMenuItemRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateCatalogMenuItemCommand(
            restaurantId,
            request.CategoryId,
            request.Name,
            request.Description,
            request.Price,
            request.DiscountPrice,
            request.ImageFileId,
            request.DisplayOrder,
            request.IsAvailable,
            request.IsActive);

        var result = await _sender.Send(command, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpPut("menu-items/{menuItemId:guid}")]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(MenuItemDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<MenuItemDto>> UpdateMenuItem(
        Guid restaurantId,
        Guid menuItemId,
        [FromBody] UpdateCatalogMenuItemRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateCatalogMenuItemCommand(
            menuItemId,
            restaurantId,
            request.CategoryId,
            request.Name,
            request.Description,
            request.Price,
            request.DiscountPrice,
            request.ImageFileId,
            request.DisplayOrder,
            request.IsAvailable,
            request.IsActive);

        var result = await _sender.Send(command, cancellationToken);
        return Ok(result);
    }

    [HttpPut("profile-content")]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(RestaurantDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<RestaurantDto>> UpdateProfileContent(
        Guid restaurantId,
        [FromBody] UpdateRestaurantProfileContentRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateRestaurantProfileContentCommand(
            restaurantId,
            request.Name,
            request.Description,
            request.Address);

        var result = await _sender.Send(command, cancellationToken);
        return Ok(result);
    }
}

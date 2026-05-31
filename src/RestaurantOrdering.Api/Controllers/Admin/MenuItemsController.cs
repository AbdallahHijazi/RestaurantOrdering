using MediatR;
using Microsoft.AspNetCore.Mvc;
using RestaurantOrdering.Api.Contracts.Admin.MenuItems;
using RestaurantOrdering.Application.Features.MenuItems.Commands.CreateMenuItem;
using RestaurantOrdering.Application.Features.MenuItems.Commands.DeleteMenuItem;
using RestaurantOrdering.Application.Features.MenuItems.Commands.UpdateMenuItem;
using RestaurantOrdering.Application.Features.MenuItems.DTOs;
using RestaurantOrdering.Application.Features.MenuItems.Queries.GetMenuItemById;
using RestaurantOrdering.Application.Features.MenuItems.Queries.GetMenuItems;

namespace RestaurantOrdering.Api.Controllers.Admin;

[ApiController]
[Route("api/v1/admin/restaurants/{restaurantId:guid}/menu-items")]
public sealed class MenuItemsController : ControllerBase
{
    private readonly ISender _sender;

    public MenuItemsController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<MenuItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MenuItemDto>>> GetAll(
        Guid restaurantId,
        [FromQuery] Guid? categoryId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new GetMenuItemsQuery(restaurantId, categoryId), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{menuItemId:guid}")]
    [ProducesResponseType(typeof(MenuItemDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<MenuItemDto>> GetById(
        Guid restaurantId,
        Guid menuItemId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(
            new GetMenuItemByIdQuery(menuItemId, restaurantId),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(MenuItemDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<MenuItemDto>> Create(
        Guid restaurantId,
        [FromBody] CreateMenuItemRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateMenuItemCommand(
            restaurantId,
            request.CategoryId,
            request.ImageFileId,
            request.NameAr,
            request.NameEn,
            request.DescriptionAr,
            request.DescriptionEn,
            request.Price,
            request.DiscountPrice,
            request.DisplayOrder,
            request.IsAvailable,
            request.IsActive);

        var result = await _sender.Send(command, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpPut("{menuItemId:guid}")]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(MenuItemDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<MenuItemDto>> Update(
        Guid restaurantId,
        Guid menuItemId,
        [FromBody] UpdateMenuItemRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateMenuItemCommand(
            menuItemId,
            restaurantId,
            request.CategoryId,
            request.ImageFileId,
            request.NameAr,
            request.NameEn,
            request.DescriptionAr,
            request.DescriptionEn,
            request.Price,
            request.DiscountPrice,
            request.DisplayOrder,
            request.IsAvailable,
            request.IsActive);

        var result = await _sender.Send(command, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{menuItemId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(
        Guid restaurantId,
        Guid menuItemId,
        CancellationToken cancellationToken)
    {
        await _sender.Send(new DeleteMenuItemCommand(menuItemId, restaurantId), cancellationToken);
        return NoContent();
    }
}

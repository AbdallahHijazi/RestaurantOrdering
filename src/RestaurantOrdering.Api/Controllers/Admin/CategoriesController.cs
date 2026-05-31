using MediatR;
using Microsoft.AspNetCore.Mvc;
using RestaurantOrdering.Api.Contracts.Admin.Categories;
using RestaurantOrdering.Application.Features.Categories.Commands.CreateCategory;
using RestaurantOrdering.Application.Features.Categories.Commands.DeleteCategory;
using RestaurantOrdering.Application.Features.Categories.Commands.UpdateCategory;
using RestaurantOrdering.Application.Features.Categories.DTOs;
using RestaurantOrdering.Application.Features.Categories.Queries.GetCategories;
using RestaurantOrdering.Application.Features.Categories.Queries.GetCategoryById;

namespace RestaurantOrdering.Api.Controllers.Admin;

[ApiController]
[Route("api/v1/admin/restaurants/{restaurantId:guid}/categories")]
public sealed class CategoriesController : ControllerBase
{
    private readonly ISender _sender;

    public CategoriesController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CategoryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> GetAll(
        Guid restaurantId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new GetCategoriesQuery(restaurantId), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{categoryId:guid}")]
    [ProducesResponseType(typeof(CategoryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CategoryDto>> GetById(
        Guid restaurantId,
        Guid categoryId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(
            new GetCategoryByIdQuery(categoryId, restaurantId),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(CategoryDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<CategoryDto>> Create(
        Guid restaurantId,
        [FromBody] CreateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateCategoryCommand(
            restaurantId,
            request.NameAr,
            request.NameEn,
            request.DescriptionAr,
            request.DescriptionEn,
            request.DisplayOrder,
            request.IsActive);

        var result = await _sender.Send(command, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpPut("{categoryId:guid}")]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(CategoryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CategoryDto>> Update(
        Guid restaurantId,
        Guid categoryId,
        [FromBody] UpdateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateCategoryCommand(
            categoryId,
            restaurantId,
            request.NameAr,
            request.NameEn,
            request.DescriptionAr,
            request.DescriptionEn,
            request.DisplayOrder,
            request.IsActive);

        var result = await _sender.Send(command, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{categoryId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(
        Guid restaurantId,
        Guid categoryId,
        CancellationToken cancellationToken)
    {
        await _sender.Send(new DeleteCategoryCommand(categoryId, restaurantId), cancellationToken);
        return NoContent();
    }
}

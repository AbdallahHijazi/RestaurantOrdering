using MediatR;
using Microsoft.AspNetCore.Mvc;
using RestaurantOrdering.Api.Contracts.Admin.Customers;
using RestaurantOrdering.Application.Features.Customers.Commands.CreateCustomer;
using RestaurantOrdering.Application.Features.Customers.Commands.DeleteCustomer;
using RestaurantOrdering.Application.Features.Customers.Commands.UpdateCustomer;
using RestaurantOrdering.Application.Features.Customers.DTOs;
using RestaurantOrdering.Application.Features.Customers.Queries.GetCustomerById;
using RestaurantOrdering.Application.Features.Customers.Queries.GetCustomers;

namespace RestaurantOrdering.Api.Controllers.Admin;

[ApiController]
[Route("api/v1/admin/restaurants/{restaurantId:guid}/customers")]
public sealed class CustomersController : ControllerBase
{
    private readonly ISender _sender;

    public CustomersController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CustomerDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CustomerDto>>> GetAll(
        Guid restaurantId,
        [FromQuery] string? searchTerm,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new GetCustomersQuery(restaurantId, searchTerm), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{customerId:guid}")]
    [ProducesResponseType(typeof(CustomerDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CustomerDto>> GetById(
        Guid restaurantId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(
            new GetCustomerByIdQuery(customerId, restaurantId),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(CustomerDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<CustomerDto>> Create(
        Guid restaurantId,
        [FromBody] CreateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateCustomerCommand(
            restaurantId,
            request.Name,
            request.Phone,
            request.Email);

        var result = await _sender.Send(command, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpPut("{customerId:guid}")]
    [Consumes("application/json")]
    [RequestSizeLimit(65536)]
    [ProducesResponseType(typeof(CustomerDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CustomerDto>> Update(
        Guid restaurantId,
        Guid customerId,
        [FromBody] UpdateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateCustomerCommand(
            customerId,
            restaurantId,
            request.Name,
            request.Phone,
            request.Email);

        var result = await _sender.Send(command, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{customerId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(
        Guid restaurantId,
        Guid customerId,
        CancellationToken cancellationToken)
    {
        await _sender.Send(new DeleteCustomerCommand(customerId, restaurantId), cancellationToken);
        return NoContent();
    }
}

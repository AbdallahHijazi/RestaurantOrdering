using MediatR;
using RestaurantOrdering.Application.Features.Customers.DTOs;

namespace RestaurantOrdering.Application.Features.Customers.Commands.UpdateCustomer;

public sealed record UpdateCustomerCommand(
    Guid CustomerId,
    Guid RestaurantId,
    string Name,
    string Phone,
    string? Email) : IRequest<CustomerDto>;

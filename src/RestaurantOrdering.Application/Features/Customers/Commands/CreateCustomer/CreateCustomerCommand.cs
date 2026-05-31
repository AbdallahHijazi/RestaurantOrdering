using MediatR;
using RestaurantOrdering.Application.Features.Customers.DTOs;

namespace RestaurantOrdering.Application.Features.Customers.Commands.CreateCustomer;

public sealed record CreateCustomerCommand(
    Guid RestaurantId,
    string Name,
    string Phone,
    string? Email) : IRequest<CustomerDto>;

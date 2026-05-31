using MediatR;
using RestaurantOrdering.Application.Features.Customers.DTOs;

namespace RestaurantOrdering.Application.Features.Customers.Queries.GetCustomerById;

public sealed record GetCustomerByIdQuery(Guid CustomerId, Guid RestaurantId) : IRequest<CustomerDto>;

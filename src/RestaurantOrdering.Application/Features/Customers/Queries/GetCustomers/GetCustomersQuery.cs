using MediatR;
using RestaurantOrdering.Application.Features.Customers.DTOs;

namespace RestaurantOrdering.Application.Features.Customers.Queries.GetCustomers;

public sealed record GetCustomersQuery(Guid RestaurantId, string? SearchTerm = null)
    : IRequest<IReadOnlyList<CustomerDto>>;

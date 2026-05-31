using MediatR;

namespace RestaurantOrdering.Application.Features.Customers.Commands.DeleteCustomer;

public sealed record DeleteCustomerCommand(Guid CustomerId, Guid RestaurantId) : IRequest<Unit>;

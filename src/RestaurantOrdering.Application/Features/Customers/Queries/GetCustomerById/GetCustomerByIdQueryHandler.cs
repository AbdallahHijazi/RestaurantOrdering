using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.Customers.Common;
using RestaurantOrdering.Application.Features.Customers.DTOs;

namespace RestaurantOrdering.Application.Features.Customers.Queries.GetCustomerById;

public sealed class GetCustomerByIdQueryHandler
    : IRequestHandler<GetCustomerByIdQuery, CustomerDto>
{
    private readonly IApplicationDbContext _context;

    public GetCustomerByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CustomerDto> Handle(
        GetCustomerByIdQuery request,
        CancellationToken cancellationToken)
    {
        var customer = await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(
                c => c.Id == request.CustomerId && c.RestaurantId == request.RestaurantId,
                cancellationToken);

        if (customer is null)
        {
            throw new NotFoundException("Customer", request.CustomerId);
        }

        return customer.ToDto();
    }
}

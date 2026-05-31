using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.Customers.Common;
using RestaurantOrdering.Application.Features.Customers.DTOs;

namespace RestaurantOrdering.Application.Features.Customers.Queries.GetCustomers;

public sealed class GetCustomersQueryHandler
    : IRequestHandler<GetCustomersQuery, IReadOnlyList<CustomerDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCustomersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<CustomerDto>> Handle(
        GetCustomersQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Customers
            .AsNoTracking()
            .Where(customer => customer.RestaurantId == request.RestaurantId);

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.Trim();

            query = query.Where(customer =>
                customer.Name.Contains(searchTerm) ||
                customer.Phone.Contains(searchTerm) ||
                (customer.Email != null && customer.Email.Contains(searchTerm)));
        }

        var customers = await query
            .OrderBy(customer => customer.Name)
            .ThenBy(customer => customer.Phone)
            .ToListAsync(cancellationToken);

        return customers
            .Select(customer => customer.ToDto())
            .ToList()
            .AsReadOnly();
    }
}

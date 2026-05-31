using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.Customers.Common;
using RestaurantOrdering.Application.Features.Customers.DTOs;

namespace RestaurantOrdering.Application.Features.Customers.Commands.UpdateCustomer;

public sealed class UpdateCustomerCommandHandler
    : IRequestHandler<UpdateCustomerCommand, CustomerDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public UpdateCustomerCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<CustomerDto> Handle(
        UpdateCustomerCommand request,
        CancellationToken cancellationToken)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(
                c => c.Id == request.CustomerId && c.RestaurantId == request.RestaurantId,
                cancellationToken);

        if (customer is null)
        {
            throw new NotFoundException("Customer", request.CustomerId);
        }

        var phone = request.Phone.Trim();

        var phoneInUse = await _context.Customers
            .IgnoreQueryFilters()
            .AnyAsync(
                c => c.RestaurantId == request.RestaurantId &&
                     c.Phone == phone &&
                     c.Id != request.CustomerId,
                cancellationToken);

        if (phoneInUse)
        {
            throw new ConflictException("Customer phone number is already in use for this restaurant.");
        }

        customer.Name = request.Name.Trim();
        customer.Phone = phone;
        customer.Email = CustomerInputNormalizer.ToOptional(request.Email);
        customer.UpdatedAt = _dateTimeService.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return customer.ToDto();
    }
}

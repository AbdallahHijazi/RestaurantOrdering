using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantOrdering.Application.Common.Exceptions;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.Customers.Common;
using RestaurantOrdering.Application.Features.Customers.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.Customers.Commands.CreateCustomer;

public sealed class CreateCustomerCommandHandler
    : IRequestHandler<CreateCustomerCommand, CustomerDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public CreateCustomerCommandHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<CustomerDto> Handle(
        CreateCustomerCommand request,
        CancellationToken cancellationToken)
    {
        var restaurantExists = await _context.Restaurants
            .AnyAsync(r => r.Id == request.RestaurantId, cancellationToken);

        if (!restaurantExists)
        {
            throw new NotFoundException("Restaurant", request.RestaurantId);
        }

        var phone = request.Phone.Trim();

        var phoneInUse = await _context.Customers
            .IgnoreQueryFilters()
            .AnyAsync(
                c => c.RestaurantId == request.RestaurantId && c.Phone == phone,
                cancellationToken);

        if (phoneInUse)
        {
            throw new ConflictException("Customer phone number is already in use for this restaurant.");
        }

        var customer = new Customer
        {
            RestaurantId = request.RestaurantId,
            Name = request.Name.Trim(),
            Phone = phone,
            Email = CustomerInputNormalizer.ToOptional(request.Email),
            IsDeleted = false,
            CreatedAt = _dateTimeService.UtcNow
        };

        _context.Customers.Add(customer);

        await _context.SaveChangesAsync(cancellationToken);

        return customer.ToDto();
    }
}

using RestaurantOrdering.Application.Features.Customers.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.Customers.Common;

public static class CustomerMappings
{
    public static CustomerDto ToDto(this Customer customer) => new()
    {
        Id = customer.Id,
        RestaurantId = customer.RestaurantId,
        Name = customer.Name,
        Phone = customer.Phone,
        Email = customer.Email,
        CreatedAt = customer.CreatedAt,
        UpdatedAt = customer.UpdatedAt
    };
}

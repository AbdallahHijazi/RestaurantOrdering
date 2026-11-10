using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.RestaurantUsers.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantUsers.Commands.CreateRestaurantUser;

public sealed record CreateRestaurantUserCommand(
    Guid RestaurantId,
    string Email,
    string Password,
    string? FullName,
    string? PhoneNumber,
    string Role) : IRequest<RestaurantUserDto>, IRestaurantScopedRequest;

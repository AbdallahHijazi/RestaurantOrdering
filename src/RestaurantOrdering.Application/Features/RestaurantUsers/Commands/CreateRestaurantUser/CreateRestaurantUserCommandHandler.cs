using FluentValidation;
using MediatR;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.RestaurantUsers.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantUsers.Commands.CreateRestaurantUser;

public sealed class CreateRestaurantUserCommandHandler
    : IRequestHandler<CreateRestaurantUserCommand, RestaurantUserDto>
{
    private readonly IRestaurantUserManagementService _restaurantUserManagementService;

    public CreateRestaurantUserCommandHandler(
        IRestaurantUserManagementService restaurantUserManagementService)
    {
        _restaurantUserManagementService = restaurantUserManagementService;
    }

    public Task<RestaurantUserDto> Handle(
        CreateRestaurantUserCommand request,
        CancellationToken cancellationToken) =>
        _restaurantUserManagementService.CreateRestaurantStaffUserAsync(
            request.RestaurantId,
            request.Email,
            request.Password,
            request.FullName,
            request.PhoneNumber,
            request.Role,
            cancellationToken);
}

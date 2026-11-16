using MediatR;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.RestaurantUsers.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantUsers.Commands.UpdateRestaurantUser;

public sealed class UpdateRestaurantUserCommandHandler
    : IRequestHandler<UpdateRestaurantUserCommand, RestaurantUserDto>
{
    private readonly IRestaurantUserManagementService _service;

    public UpdateRestaurantUserCommandHandler(IRestaurantUserManagementService service)
    {
        _service = service;
    }

    public Task<RestaurantUserDto> Handle(
        UpdateRestaurantUserCommand request,
        CancellationToken cancellationToken) =>
        _service.UpdateRestaurantStaffUserAsync(
            request.RestaurantId,
            request.UserId,
            request.FullName,
            request.PhoneNumber,
            cancellationToken);
}

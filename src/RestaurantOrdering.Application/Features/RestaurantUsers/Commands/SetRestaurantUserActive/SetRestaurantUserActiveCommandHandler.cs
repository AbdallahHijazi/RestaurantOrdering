using MediatR;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.RestaurantUsers.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantUsers.Commands.SetRestaurantUserActive;

public sealed class SetRestaurantUserActiveCommandHandler
    : IRequestHandler<SetRestaurantUserActiveCommand, RestaurantUserDto>
{
    private readonly IRestaurantUserManagementService _service;
    private readonly ICurrentUserService _currentUserService;

    public SetRestaurantUserActiveCommandHandler(
        IRestaurantUserManagementService service,
        ICurrentUserService currentUserService)
    {
        _service = service;
        _currentUserService = currentUserService;
    }

    public Task<RestaurantUserDto> Handle(
        SetRestaurantUserActiveCommand request,
        CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId
            ?? throw new UnauthorizedAccessException("Authentication is required.");

        return _service.SetRestaurantStaffUserActiveAsync(
            request.RestaurantId,
            request.UserId,
            request.IsActive,
            currentUserId,
            cancellationToken);
    }
}

using MediatR;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Features.Auth.DTOs;

namespace RestaurantOrdering.Application.Features.Auth.Commands.RegisterRestaurantOwner;

public sealed class RegisterRestaurantOwnerCommandHandler
    : IRequestHandler<RegisterRestaurantOwnerCommand, RegisterRestaurantOwnerResultDto>
{
    private readonly IRestaurantOwnerRegistrationService _registrationService;

    public RegisterRestaurantOwnerCommandHandler(
        IRestaurantOwnerRegistrationService registrationService)
    {
        _registrationService = registrationService;
    }

    public Task<RegisterRestaurantOwnerResultDto> Handle(
        RegisterRestaurantOwnerCommand request,
        CancellationToken cancellationToken) =>
        _registrationService.RegisterRestaurantOwnerAsync(
            request.Email,
            request.Password,
            request.FullName,
            request.PhoneNumber,
            request.RestaurantNameAr,
            request.RestaurantNameEn,
            request.Slug,
            cancellationToken);
}

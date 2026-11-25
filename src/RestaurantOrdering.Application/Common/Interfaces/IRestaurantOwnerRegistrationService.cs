using RestaurantOrdering.Application.Features.Auth.DTOs;

namespace RestaurantOrdering.Application.Common.Interfaces;

public interface IRestaurantOwnerRegistrationService
{
    Task<RegisterRestaurantOwnerResultDto> RegisterRestaurantOwnerAsync(
        string email,
        string password,
        string fullName,
        string? phoneNumber,
        string restaurantNameAr,
        string? restaurantNameEn,
        string slug,
        CancellationToken cancellationToken);
}

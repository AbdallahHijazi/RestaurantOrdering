using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.RestaurantUsers.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantUsers.Commands.UpdateRestaurantUser;

/// <summary>Edits a staff member's display name and phone number (role/email are changed elsewhere).</summary>
public sealed record UpdateRestaurantUserCommand(
    Guid RestaurantId,
    Guid UserId,
    string? FullName,
    string? PhoneNumber) : IRequest<RestaurantUserDto>, IRestaurantScopedRequest;

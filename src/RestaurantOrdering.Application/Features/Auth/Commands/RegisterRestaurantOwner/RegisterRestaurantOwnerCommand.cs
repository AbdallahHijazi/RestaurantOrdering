using MediatR;
using RestaurantOrdering.Application.Features.Auth.DTOs;

namespace RestaurantOrdering.Application.Features.Auth.Commands.RegisterRestaurantOwner;

public sealed record RegisterRestaurantOwnerCommand(
    string Email,
    string Password,
    string FullName,
    string? PhoneNumber,
    string RestaurantNameAr,
    string? RestaurantNameEn,
    string Slug) : IRequest<RegisterRestaurantOwnerResultDto>;

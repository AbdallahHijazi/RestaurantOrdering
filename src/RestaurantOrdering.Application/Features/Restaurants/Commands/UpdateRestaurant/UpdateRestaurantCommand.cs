using MediatR;
using RestaurantOrdering.Application.Features.Restaurants.DTOs;

namespace RestaurantOrdering.Application.Features.Restaurants.Commands.UpdateRestaurant;

public sealed record UpdateRestaurantCommand(
    Guid RestaurantId,
    string Slug,
    string NameAr,
    string? NameEn,
    string? DescriptionAr,
    string? DescriptionEn,
    string PhoneNumber,
    string? WhatsAppNumber,
    string? AddressAr,
    string? AddressEn,
    decimal? Latitude,
    decimal? Longitude) : IRequest<RestaurantDto>;

using MediatR;
using RestaurantOrdering.Application.Common.Security;
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
    decimal? Longitude,
    string AccentColor,
    // Optional contact/locale profile fields. null = "not provided, keep current value";
    // an empty string clears the optional Email/City values.
    string? CountryCode = null,
    string? PhoneCountryCode = null,
    string? Email = null,
    string? City = null) : IRequest<RestaurantDto>, IRestaurantScopedRequest;

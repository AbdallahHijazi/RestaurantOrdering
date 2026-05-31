using MediatR;
using RestaurantOrdering.Application.Features.Restaurants.DTOs;

namespace RestaurantOrdering.Application.Features.MediaFiles.Commands.SetRestaurantLogo;

public sealed record SetRestaurantLogoCommand(Guid RestaurantId, Guid MediaFileId)
    : IRequest<RestaurantDto>;

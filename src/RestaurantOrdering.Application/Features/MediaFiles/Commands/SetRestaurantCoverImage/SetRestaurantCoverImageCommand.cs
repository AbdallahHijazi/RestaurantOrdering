using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.Restaurants.DTOs;

namespace RestaurantOrdering.Application.Features.MediaFiles.Commands.SetRestaurantCoverImage;

public sealed record SetRestaurantCoverImageCommand(Guid RestaurantId, Guid MediaFileId)
    : IRequest<RestaurantDto>, IRestaurantScopedRequest;

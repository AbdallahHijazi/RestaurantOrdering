using MediatR;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Security;

namespace RestaurantOrdering.Application.Common.Behaviors;

public sealed class RestaurantOwnershipBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRestaurantScopedRequest
{
    private readonly IRestaurantAuthorizationService _restaurantAuthorizationService;

    public RestaurantOwnershipBehavior(IRestaurantAuthorizationService restaurantAuthorizationService)
    {
        _restaurantAuthorizationService = restaurantAuthorizationService;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        await _restaurantAuthorizationService
            .EnsureCurrentUserOwnsRestaurantAsync(request.RestaurantId, cancellationToken);

        return await next();
    }
}


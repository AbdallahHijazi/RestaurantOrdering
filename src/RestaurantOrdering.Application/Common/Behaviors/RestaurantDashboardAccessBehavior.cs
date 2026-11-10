using MediatR;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Security;

namespace RestaurantOrdering.Application.Common.Behaviors;

public sealed class RestaurantDashboardAccessBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRestaurantDashboardScopedRequest
{
    private readonly IRestaurantAuthorizationService _restaurantAuthorizationService;

    public RestaurantDashboardAccessBehavior(
        IRestaurantAuthorizationService restaurantAuthorizationService)
    {
        _restaurantAuthorizationService = restaurantAuthorizationService;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        await _restaurantAuthorizationService.EnsureCurrentUserCanAccessRestaurantDashboardAsync(
            request.RestaurantId,
            cancellationToken);

        return await next();
    }
}

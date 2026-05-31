using RestaurantOrdering.Api.Middleware;

namespace RestaurantOrdering.Api.Extensions;

public static class ExceptionMiddlewareExtensions
{
    public static IApplicationBuilder UseApiExceptionHandling(this IApplicationBuilder app) =>
        app.UseMiddleware<ApiExceptionMiddleware>();
}

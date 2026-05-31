using RestaurantOrdering.Api.Middleware;

namespace RestaurantOrdering.Api.Extensions;

public static class DevelopmentOnlyAdminAccessExtensions
{
    // TODO: Replace this development-only guard with JWT authentication,
    // [Authorize], restaurant_id claim validation, and authorization policies
    // before any public deployment.
    public static IApplicationBuilder UseDevelopmentOnlyAdminAccessGuard(this IApplicationBuilder app) =>
        app.UseMiddleware<DevelopmentOnlyAdminAccessMiddleware>();
}

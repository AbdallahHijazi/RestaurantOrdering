using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using RestaurantOrdering.Application.Common.Behaviors;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Security;
using System.Reflection;

namespace RestaurantOrdering.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(assembly));

        services.AddValidatorsFromAssembly(assembly);

        services.AddTransient(
            typeof(IPipelineBehavior<,>),
            typeof(ValidationBehavior<,>));
        services.AddTransient(
            typeof(IPipelineBehavior<,>),
            typeof(RestaurantOwnershipBehavior<,>));
        services.AddTransient(
            typeof(IPipelineBehavior<,>),
            typeof(RestaurantDashboardAccessBehavior<,>));
        services.AddScoped<IRestaurantAuthorizationService, RestaurantAuthorizationService>();

        return services;
    }
}

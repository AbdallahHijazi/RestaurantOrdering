using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using RestaurantOrdering.Application.Common.Behaviors;
using RestaurantOrdering.Application.Common.Interfaces;
using RestaurantOrdering.Application.Common.Localization;
using RestaurantOrdering.Application.Common.Translation;
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
        services.AddScoped<ICurrentRequestDashboardAccess, CurrentRequestDashboardAccess>();
        services.AddScoped<IPublishedTranslationWriter, PublishedTranslationWriter>();
        services.AddScoped<ITranslationJobEnqueuer, TranslationJobEnqueuer>();
        services.AddScoped<ITranslationJobProcessor, TranslationJobProcessor>();
        services.AddScoped<IPublicLocaleResolver, PublicLocaleResolver>();

        return services;
    }
}

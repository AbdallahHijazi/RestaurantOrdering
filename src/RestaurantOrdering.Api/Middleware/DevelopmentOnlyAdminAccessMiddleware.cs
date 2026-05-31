using System.Net;
using Microsoft.AspNetCore.Mvc;

namespace RestaurantOrdering.Api.Middleware;

// TODO: This is a temporary local-development guard only.
// Do not expose the Development environment to the internet.
// Replace before any public deployment with JWT authentication,
// [Authorize], restaurant_id claim validation, and authorization policies.
// Trusted reverse proxy support requires separate ForwardedHeaders configuration;
// do not blindly trust X-Forwarded-For.
public sealed class DevelopmentOnlyAdminAccessMiddleware
{
    private const string AdminPathPrefix = "/api/v1/admin";

    private readonly RequestDelegate _next;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<DevelopmentOnlyAdminAccessMiddleware> _logger;

    public DevelopmentOnlyAdminAccessMiddleware(
        RequestDelegate next,
        IHostEnvironment environment,
        ILogger<DevelopmentOnlyAdminAccessMiddleware> logger)
    {
        _next = next;
        _environment = environment;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!IsAdminPath(context.Request.Path))
        {
            await _next(context);
            return;
        }

        if (_environment.IsDevelopment() && IsLoopbackRequest(context))
        {
            await _next(context);
            return;
        }

        var rejectionReason = _environment.IsDevelopment()
            ? "NonLoopbackRequest"
            : "NonDevelopmentEnvironment";

        _logger.LogWarning(
            "Blocked admin path access. Method={Method}, Path={Path}, Environment={EnvironmentName}, TraceId={TraceId}, RejectionReason={RejectionReason}",
            context.Request.Method,
            context.Request.Path,
            _environment.EnvironmentName,
            context.TraceIdentifier,
            rejectionReason);

        await WriteNotFoundResponseAsync(context);
    }

    private static bool IsAdminPath(PathString path) =>
        path.StartsWithSegments(AdminPathPrefix, StringComparison.OrdinalIgnoreCase);

    private static bool IsLoopbackRequest(HttpContext context)
    {
        var remoteIpAddress = context.Connection.RemoteIpAddress;

        if (remoteIpAddress is null)
        {
            return false;
        }

        if (remoteIpAddress.IsIPv4MappedToIPv6)
        {
            remoteIpAddress = remoteIpAddress.MapToIPv4();
        }

        return IPAddress.IsLoopback(remoteIpAddress);
    }

    private static async Task WriteNotFoundResponseAsync(HttpContext context)
    {
        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status404NotFound,
            Title = "Resource not found.",
            Detail = "The requested resource was not found.",
            Instance = context.Request.Path
        };

        problemDetails.Extensions["traceId"] = context.TraceIdentifier;

        context.Response.StatusCode = StatusCodes.Status404NotFound;
        context.Response.ContentType = "application/problem+json";

        await context.Response.WriteAsJsonAsync(problemDetails, context.RequestAborted);
    }
}

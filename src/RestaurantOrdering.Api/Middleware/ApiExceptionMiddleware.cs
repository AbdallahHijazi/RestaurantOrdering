using System.Text.Json;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using RestaurantOrdering.Application.Common.Exceptions;

namespace RestaurantOrdering.Api.Middleware;

public sealed class ApiExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiExceptionMiddleware> _logger;

    public ApiExceptionMiddleware(
        RequestDelegate next,
        ILogger<ApiExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            if (context.Response.HasStarted)
            {
                _logger.LogError(
                    exception,
                    "Exception thrown after the response started for {Method} {Path}",
                    context.Request.Method,
                    context.Request.Path);

                throw;
            }

            await HandleExceptionAsync(context, exception);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, title, detail, errors) = MapException(exception);

        if (statusCode == StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(
                exception,
                "Unhandled exception while processing {Method} {Path}",
                context.Request.Method,
                context.Request.Path);
        }

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path
        };

        problemDetails.Extensions["traceId"] = context.TraceIdentifier;

        if (errors is not null)
        {
            problemDetails.Extensions["errors"] = errors;
        }

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";

        await context.Response.WriteAsJsonAsync(
            problemDetails,
            JsonSerializerOptions.Default,
            "application/problem+json",
            context.RequestAborted);
    }

    private static (int StatusCode, string Title, string Detail, Dictionary<string, string[]>? Errors) MapException(
        Exception exception)
    {
        return exception switch
        {
            ValidationException validationException => (
                StatusCodes.Status400BadRequest,
                "Validation failed.",
                "One or more validation errors occurred.",
                GroupValidationErrors(validationException)),

            NotFoundException notFoundException => (
                StatusCodes.Status404NotFound,
                "Resource not found.",
                notFoundException.Message,
                null),

            ConflictException conflictException => (
                StatusCodes.Status409Conflict,
                "Conflict.",
                conflictException.Message,
                null),

            ForbiddenException forbiddenException => (
                StatusCodes.Status403Forbidden,
                "Forbidden.",
                forbiddenException.Message,
                null),

            UnauthorizedAccessException unauthorizedAccessException => (
                StatusCodes.Status401Unauthorized,
                "Unauthorized.",
                unauthorizedAccessException.Message,
                null),

            ArgumentNullException argumentNullException => (
                StatusCodes.Status400BadRequest,
                "Invalid request.",
                argumentNullException.Message,
                null),

            ArgumentException argumentException => (
                StatusCodes.Status400BadRequest,
                "Invalid request.",
                argumentException.Message,
                null),

            _ => (
                StatusCodes.Status500InternalServerError,
                "An unexpected error occurred.",
                "An unexpected error occurred while processing the request.",
                null)
        };
    }

    private static Dictionary<string, string[]> GroupValidationErrors(ValidationException validationException) =>
        validationException.Errors
            .GroupBy(error => error.PropertyName)
            .ToDictionary(
                group => group.Key,
                group => group.Select(error => error.ErrorMessage).ToArray());
}

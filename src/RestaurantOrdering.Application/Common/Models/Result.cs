namespace RestaurantOrdering.Application.Common.Models;

public class Result
{
    public bool IsSuccess { get; init; }

    public string? ErrorCode { get; init; }

    public string? ErrorMessage { get; init; }

    public IReadOnlyCollection<string> Errors { get; init; } = Array.Empty<string>();

    public static Result Success() => new() { IsSuccess = true };

    public static Result Failure(string errorCode, string errorMessage) => new()
    {
        IsSuccess = false,
        ErrorCode = errorCode,
        ErrorMessage = errorMessage
    };

    public static Result ValidationFailure(IEnumerable<string> errors) => new()
    {
        IsSuccess = false,
        ErrorCode = "Validation.Failed",
        ErrorMessage = "One or more validation errors occurred.",
        Errors = errors.ToList().AsReadOnly()
    };
}

public class Result<T> : Result
{
    public T? Value { get; init; }

    public static Result<T> Success(T value) => new()
    {
        IsSuccess = true,
        Value = value
    };

    public static new Result<T> Failure(string errorCode, string errorMessage) => new()
    {
        IsSuccess = false,
        ErrorCode = errorCode,
        ErrorMessage = errorMessage
    };

    public static new Result<T> ValidationFailure(IEnumerable<string> errors) => new()
    {
        IsSuccess = false,
        ErrorCode = "Validation.Failed",
        ErrorMessage = "One or more validation errors occurred.",
        Errors = errors.ToList().AsReadOnly()
    };
}

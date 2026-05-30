using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RestaurantOrdering.Application.Common.Models
{
    public class Result
    {
        public bool Succeeded { get; init; }
        public string? Error { get; init; }
        public IReadOnlyList<string> Errors { get; init; } = Array.Empty<string>();

        public static Result Success()
        {
            return new Result { Succeeded = true };
        }

        public static Result Failure(string error)
        {
            return new Result
            {
                Succeeded = false,
                Error = error,
                Errors = new[] { error }
            };
        }

        public static Result Failure(IEnumerable<string> errors)
        {
            var errorList = errors.ToArray();

            return new Result
            {
                Succeeded = false,
                Error = errorList.FirstOrDefault(),
                Errors = errorList
            };
        }
    }

    public class Result<T> : Result
    {
        public T? Data { get; init; }

        public static Result<T> Success(T data)
        {
            return new Result<T>
            {
                Succeeded = true,
                Data = data
            };
        }

        public new static Result<T> Failure(string error)
        {
            return new Result<T>
            {
                Succeeded = false,
                Error = error,
                Errors = new[] { error }
            };
        }
    }
}

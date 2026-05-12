namespace ProjectFlow.Application.DTOs.Common;

/// <summary>
/// Standard API response wrapper.
/// </summary>
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }
    public ApiError? Error { get; set; }

    public static ApiResponse<T> SuccessResult(T? data, string? message = null)
    {
        return new ApiResponse<T>
        {
            Success = true,
            Data = data,
            Message = message
        };
    }

    public static ApiResponse<T> FailureResult(string code, string message)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Error = new ApiError { Code = code, Message = message }
        };
    }
}

/// <summary>
/// Standard API error response for backwards compatibility in controllers.
/// </summary>
public class ApiErrorResponse
{
    public bool Success { get; set; } = false;
    public ApiError Error { get; set; } = new();
}

public class ApiError
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}


using System.Security.Cryptography;

namespace RestaurantOrdering.Application.Common.Security;

public static class TablePublicTokenGenerator
{
    private const int TokenByteLength = 16;

    public static string Generate()
    {
        var bytes = RandomNumberGenerator.GetBytes(TokenByteLength);
        return ToBase64Url(bytes);
    }

    private static string ToBase64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
}

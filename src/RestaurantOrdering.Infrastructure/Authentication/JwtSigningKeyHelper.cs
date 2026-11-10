using System.Text;

namespace RestaurantOrdering.Infrastructure.Authentication;

public static class JwtSigningKeyHelper
{
    public const int MinimumSigningKeyBytes = 32;

    public static bool TryGetSigningKeyBytes(string? signingKey, out byte[] keyBytes)
    {
        keyBytes = Array.Empty<byte>();

        if (string.IsNullOrWhiteSpace(signingKey))
        {
            return false;
        }

        var trimmedSigningKey = signingKey.Trim();
        if (Encoding.UTF8.GetByteCount(trimmedSigningKey) < MinimumSigningKeyBytes)
        {
            return false;
        }

        keyBytes = Encoding.UTF8.GetBytes(trimmedSigningKey);
        return true;
    }
}

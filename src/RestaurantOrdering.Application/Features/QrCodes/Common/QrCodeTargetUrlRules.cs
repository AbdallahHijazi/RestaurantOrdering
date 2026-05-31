namespace RestaurantOrdering.Application.Features.QrCodes.Common;

public static class QrCodeTargetUrlRules
{
    public static bool IsValidAbsoluteHttpOrHttpsUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return false;
        }

        return Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}

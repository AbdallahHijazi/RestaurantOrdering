namespace RestaurantOrdering.Api.Contracts.Admin.QrCodes;

public sealed class UpdateMenuQrCodeRequest
{
    public string TargetUrl { get; init; } = string.Empty;
    public bool IsActive { get; init; }
}

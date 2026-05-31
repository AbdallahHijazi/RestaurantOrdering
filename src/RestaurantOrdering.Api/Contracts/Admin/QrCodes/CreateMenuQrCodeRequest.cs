namespace RestaurantOrdering.Api.Contracts.Admin.QrCodes;

public sealed class CreateMenuQrCodeRequest
{
    public string TargetUrl { get; init; } = string.Empty;
    public bool IsActive { get; init; } = true;
}

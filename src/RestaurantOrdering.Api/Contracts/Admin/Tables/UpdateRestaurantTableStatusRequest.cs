namespace RestaurantOrdering.Api.Contracts.Admin.Tables;

public sealed class UpdateRestaurantTableStatusRequest
{
    public bool IsActive { get; init; }
}

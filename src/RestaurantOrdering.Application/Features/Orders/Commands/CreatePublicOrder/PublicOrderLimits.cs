namespace RestaurantOrdering.Application.Features.Orders.Commands.CreatePublicOrder;

public static class PublicOrderLimits
{
    public const int MinQuantityPerItem = 1;
    public const int MaxQuantityPerItem = 99;
    public const int MaxItemLines = 100;
}

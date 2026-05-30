namespace RestaurantOrdering.Domain.Enums;

public enum OrderStatus : byte
{
    New = 1,
    Preparing = 2,
    Ready = 3,
    Completed = 4,
    Cancelled = 5
}

namespace RestaurantOrdering.Application.Features.Orders.Common;

public static class OrderNumberGenerator
{
    public static string Generate(Guid orderId)
    {
        var guidSegment = orderId.ToString("N")[..16].ToUpperInvariant();
        return $"ORD-{guidSegment}";
    }
}

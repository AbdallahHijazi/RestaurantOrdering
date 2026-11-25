namespace RestaurantOrdering.Application.Common.Exceptions;

public sealed record UpdatedOrderPrice(Guid MenuItemId, Guid? MenuItemSizeId, decimal BasePrice, decimal FinalPrice);

public sealed class OrderPricesChangedException(IReadOnlyList<UpdatedOrderPrice> prices)
    : ConflictException("Prices have changed. Review the updated total before confirming your order.")
{
    public IReadOnlyList<UpdatedOrderPrice> Prices { get; } = prices;
}

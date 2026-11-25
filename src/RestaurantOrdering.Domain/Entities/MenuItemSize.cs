namespace RestaurantOrdering.Domain.Entities;

public sealed record MenuItemSize(Guid? Id, string Name, decimal Price, bool IsAvailable, int DisplayOrder);

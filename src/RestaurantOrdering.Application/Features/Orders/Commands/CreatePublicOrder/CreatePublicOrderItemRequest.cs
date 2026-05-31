namespace RestaurantOrdering.Application.Features.Orders.Commands.CreatePublicOrder;

public sealed record CreatePublicOrderItemRequest(
    Guid MenuItemId,
    int Quantity,
    string? Notes);

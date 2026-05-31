namespace RestaurantOrdering.Application.Features.Orders.DTOs;

public class GetOrdersResultDto
{
    public IReadOnlyList<OrderSummaryDto> Items { get; init; } =
        Array.Empty<OrderSummaryDto>();
    public int TotalCount { get; init; }
    public int PageNumber { get; init; }
    public int PageSize { get; init; }
}

using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.RestaurantTables.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Commands.ArchiveRestaurantTable;

/// <summary>
/// Soft-deletes (archives) or restores a table. The row is kept so historical orders and references stay valid.
/// </summary>
public sealed record ArchiveRestaurantTableCommand(
    Guid RestaurantId,
    Guid TableId,
    bool IsArchived) : IRequest<RestaurantTableDto>, IRestaurantScopedRequest;

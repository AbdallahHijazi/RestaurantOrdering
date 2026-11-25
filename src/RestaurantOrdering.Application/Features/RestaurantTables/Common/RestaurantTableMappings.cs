using RestaurantOrdering.Application.Features.RestaurantTables.DTOs;
using RestaurantOrdering.Domain.Entities;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Common;

internal static class RestaurantTableMappings
{
    internal static RestaurantTableDto ToDto(this RestaurantTable table) =>
        new()
        {
            Id = table.Id,
            Name = table.Name,
            Zone = table.Zone,
            PublicToken = table.PublicToken,
            IsActive = table.IsActive,
            IsArchived = table.IsArchived,
            ArchivedAt = table.ArchivedAt,
            CreatedAt = table.CreatedAt,
            UpdatedAt = table.UpdatedAt
        };
}

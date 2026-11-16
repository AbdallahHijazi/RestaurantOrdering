using MediatR;
using RestaurantOrdering.Application.Common.Security;
using RestaurantOrdering.Application.Features.RestaurantTables.DTOs;

namespace RestaurantOrdering.Application.Features.RestaurantTables.Queries.GetRestaurantTables;

public sealed record GetRestaurantTablesQuery(Guid RestaurantId, bool IncludeArchived = false)
    : IRequest<IReadOnlyList<RestaurantTableDto>>, IRestaurantScopedRequest;
